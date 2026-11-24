<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Models\IntendedOwner;
use App\Models\Reservation;
use App\Models\Vehicle;
use Illuminate\Http\Request;

/** "My Garage": saved vehicles, reservations, loan history. Auth required. */
class GarageController extends Controller
{
    public function index(Request $request)
    {
        Reservation::expireOverdue();

        $user = $request->user();
        $coverOnly = fn (?Vehicle $v) => $v?->setRelation('media', $v->media->take(1)->values());

        $saved = $user->savedVehicles()->with('media')->get()->each($coverOnly);

        $reservations = $user->reservations()->with('vehicle.media')->latest()->get()
            ->each(fn (Reservation $r) => $coverOnly($r->vehicle));

        return response()->json([
            'saved_vehicles' => $saved,
            // Pending and verified holds first; the rest is history.
            'active_reservations' => $reservations->whereIn('status', [Reservation::STATUS_PENDING, Reservation::STATUS_VERIFIED])->values(),
            'past_reservations' => $reservations->whereNotIn('status', [Reservation::STATUS_PENDING, Reservation::STATUS_VERIFIED])->values(),
            // Cars whose Deed of Sale will name someone else, keyed by vehicle id.
            'intended_owners' => IntendedOwner::where('buyer_id', $user->id)->get()->keyBy('vehicle_id'),
            'loan_history' => $user->financingApplications()->with(['vehicle', 'documents:id,application_id,doc_type,verified'])->latest()->get(),
        ]);
    }
}
