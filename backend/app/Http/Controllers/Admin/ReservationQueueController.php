<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Vehicle;
use Illuminate\Http\Request;

/** Reservation & payment proof verification queue. Admin/CEO only. */
class ReservationQueueController extends Controller
{
    public function index(Request $request)
    {
        Reservation::expireOverdue();

        return response()->json(
            Reservation::with(['vehicle', 'buyer'])
                ->where('status', Reservation::STATUS_PENDING)
                ->oldest()
                ->paginate(50)
        );
    }

    public function verify(Reservation $reservation)
    {
        // Vehicle was already flipped to reserved when the reservation was
        // submitted (see Buyer\ReservationController::store) — this just
        // confirms the payment proof, it doesn't change vehicle state.
        $reservation->update(['status' => Reservation::STATUS_VERIFIED]);

        return response()->json($reservation);
    }

    public function reject(Reservation $reservation)
    {
        $reservation->update(['status' => Reservation::STATUS_REJECTED]);
        $reservation->vehicle()->update(['status' => Vehicle::STATUS_AVAILABLE, 'last_updated' => now()]);

        return response()->json($reservation);
    }
}
