<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcquisitionLead;
use App\Models\FinancingDocument;
use App\Models\IntendedOwner;
use App\Models\Reservation;
use App\Models\Sale;
use App\Models\TestDrive;
use App\Models\Vehicle;
use App\Models\WarrantyClaim;

/** Admin landing page: what needs doing today, in one place. */
class OverviewController extends Controller
{
    public function index()
    {
        Reservation::expireOverdue();

        $pending = Reservation::with(['vehicle', 'buyer:id,name'])->where('status', Reservation::STATUS_PENDING)->orderBy('expires_at')->take(5)->get();
        $readyToSell = Reservation::with(['vehicle', 'buyer:id,name'])->readyToSell()->oldest()->take(5)->get();
        $testDrives = TestDrive::with(['vehicle', 'buyer:id,name'])
            ->whereIn('status', [TestDrive::STATUS_PENDING, TestDrive::STATUS_CONFIRMED])
            ->where('preferred_at', '>=', now()->startOfDay())
            ->orderBy('preferred_at')->take(5)->get();

        return response()->json([
            'counts' => [
                'pending_reservations' => Reservation::where('status', Reservation::STATUS_PENDING)->count(),
                'ready_to_sell' => Reservation::readyToSell()->count(),
                'pending_test_drives' => TestDrive::where('status', TestDrive::STATUS_PENDING)->count(),
                'documents_to_verify' => FinancingDocument::where('verified', false)->count(),
                'owners_to_validate' => IntendedOwner::relevant()->where('status', IntendedOwner::STATUS_PENDING)->count(),
                'open_claims' => WarrantyClaim::whereIn('status', [WarrantyClaim::STATUS_SUBMITTED, WarrantyClaim::STATUS_UNDER_REVIEW])->count(),
                'new_leads' => AcquisitionLead::where('status', AcquisitionLead::STATUS_SUBMITTED)->count(),
                'cars_to_inspect' => Vehicle::where('status', Vehicle::STATUS_FOR_INSPECTION)->count(),
                'chats_waiting' => \App\Models\SupportConversation::waitingForStaff()->count(),
                'sales_this_month' => Sale::whereYear('sale_date', now()->year)->whereMonth('sale_date', now()->month)->count(),
                'revenue_this_month' => (float) Sale::whereYear('sale_date', now()->year)->whereMonth('sale_date', now()->month)->sum('total_amount'),
            ],
            'inventory' => Vehicle::selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
            'pending_reservations' => $pending,
            'ready_to_sell' => $readyToSell,
            'upcoming_test_drives' => $testDrives,
            'recent_sales' => Sale::with(['vehicle', 'buyer:id,name', 'legalDocuments:id,sale_id,doc_type'])->latest('sale_date')->latest('id')->take(5)->get(),
            'cars_without_photos' => Vehicle::where('status', Vehicle::STATUS_AVAILABLE)->whereDoesntHave('media', fn ($q) => $q->where('is_sample', false))->get(['id', 'year', 'make', 'model']),
        ]);
    }
}
