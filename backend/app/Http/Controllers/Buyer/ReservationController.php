<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Vehicle reservation with proof-of-payment upload + 48-hour countdown timer. Auth required. */
class ReservationController extends Controller
{
    public function index(Request $request)
    {
        Reservation::expireOverdue();

        return response()->json(
            $request->user()->reservations()->with('vehicle')->latest()->get()
        );
    }

    public function store(Request $request)
    {
        Reservation::expireOverdue();

        $data = $request->validate([
            'vehicle_id' => ['required', 'exists:vehicles,id'],
            'payment_proof' => ['required', 'file', 'image', 'max:10240'],
        ]);

        $reservation = DB::transaction(function () use ($data, $request) {
            // lockForUpdate closes the race between two buyers reserving the
            // same car in the same instant — whoever's transaction commits
            // first wins, the second sees status already flipped.
            $vehicle = Vehicle::whereKey($data['vehicle_id'])->lockForUpdate()->firstOrFail();

            if ($vehicle->status !== Vehicle::STATUS_AVAILABLE) {
                throw ValidationException::withMessages([
                    'vehicle_id' => ['This vehicle is no longer available to reserve.'],
                ]);
            }

            $path = $request->file('payment_proof')->store('uploads/payment_proofs', 'public');

            $reservation = Reservation::create([
                'vehicle_id' => $vehicle->id,
                'buyer_id' => $request->user()->id,
                'payment_proof_path' => $path,
                'status' => Reservation::STATUS_PENDING,
                'expires_at' => now()->addHours(48),
            ]);

            // Locked as soon as the reservation is submitted, not only once
            // admin verifies — otherwise a second buyer could reserve the
            // same car during the pending window (the exact double-booking
            // Story 19 is meant to prevent).
            $vehicle->update(['status' => Vehicle::STATUS_RESERVED, 'last_updated' => now()]);

            return $reservation;
        });

        return response()->json($reservation, 201);
    }

    public function show(Reservation $reservation)
    {
        $this->authorizeOwner($reservation);

        return response()->json($reservation->load('vehicle'));
    }

    private function authorizeOwner(Reservation $reservation): void
    {
        abort_unless($reservation->buyer_id === request()->user()->id, 403);
    }
}
