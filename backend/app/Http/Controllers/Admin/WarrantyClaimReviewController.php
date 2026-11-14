<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WarrantyClaim;
use App\Support\BuyerNotice;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Warranty claim review/management (1-month money-back guarantee). Admin only. */
class WarrantyClaimReviewController extends Controller
{
    private const LABELS = [
        WarrantyClaim::STATUS_SUBMITTED => 'submitted',
        WarrantyClaim::STATUS_UNDER_REVIEW => 'under review',
        WarrantyClaim::STATUS_APPROVED => 'approved',
        WarrantyClaim::STATUS_REJECTED => 'not approved',
        WarrantyClaim::STATUS_REFUNDED => 'refunded',
    ];

    public function index(Request $request)
    {
        return response()->json(
            WarrantyClaim::with(['sale.buyer:id,name,email', 'sale.vehicle'])
                ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
                ->latest()
                ->paginate(50)
        );
    }

    public function update(Request $request, WarrantyClaim $claim)
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(array_keys(self::LABELS))],
            'admin_notes' => ['sometimes', 'nullable', 'string', 'max:3000'],
        ]);

        $statusChanged = isset($data['status']) && $data['status'] !== $claim->status;
        $claim->update($data);

        if ($statusChanged) {
            $claim->load('sale.buyer', 'sale.vehicle');
            $v = $claim->sale?->vehicle;
            BuyerNotice::send($claim->sale?->buyer, "Warranty claim {$claim->ticket_number}: ".self::LABELS[$claim->status], [
                "Your warranty claim for the {$v?->year} {$v?->make} {$v?->model} is now ".self::LABELS[$claim->status].'.',
                'Our team will contact you if we need anything else.',
            ], 'View My Garage', '/garage');
        }

        return response()->json($claim->load(['sale.buyer:id,name,email', 'sale.vehicle']));
    }
}
