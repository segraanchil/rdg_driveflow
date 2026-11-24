<?php

namespace App\Http\Controllers\Buyer;

use App\Support\AdminAlert;
use App\Support\ImageShrinker;
use App\Support\OwnerRequests;
use App\Http\Controllers\Controller;
use App\Models\IntendedOwner;
use App\Models\Reservation;
use App\Models\Setting;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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
            'payment_method' => ['nullable', 'in:cash,financing'],
            // Where the reservation fee was paid; staff verify it manually against that channel.
            'payment_channel' => ['required', 'in:gcash,bank_transfer'],
            'payment_reference' => ['nullable', 'string', 'max:60'],
            'terms_accepted' => ['accepted'],
            // Whose name goes on the Deed of Sale: the buyer's, someone else's (their driver's license is
            // required), or "keep" the owner the buyer already submitted for this car.
            'deed_name' => ['required', 'in:self,other,keep'],
            ...OwnerRequests::buyerRules('required_if:deed_name,other'),
        ], [
            'payment_channel.required' => 'Choose how you paid: GCash or bank transfer.',
            'terms_accepted.accepted' => 'Read and agree to the terms and conditions first.',
            'deed_name.required' => 'Choose whose name goes on the Deed of Sale.',
            ...OwnerRequests::messages(),
        ]);

        $path = null;
        try {
            $reservation = $this->reserve($data, $request, $path);
        } catch (\Throwable $e) {
            // Not reserved: don't leave the uploaded receipt behind.
            if ($path) {
                Storage::disk('public')->delete($path);
            }
            throw $e;
        }

        $v = $reservation->vehicle;
        $this->saveDeedName($data['deed_name'], $v, $request);
        AdminAlert::notify('reservation', 'New reservation to verify', "{$request->user()->name} reserved the {$v->year} {$v->make} {$v->model}. Check the proof of payment within 48 hours.", '/admin/reservations');

        return response()->json($reservation, 201);
    }

    private function saveDeedName(string $choice, Vehicle $vehicle, Request $request): void
    {
        if ($choice === 'other') {
            OwnerRequests::submit($request->user(), $vehicle, $request);
        } elseif ($choice === 'self') {
            IntendedOwner::findFor($request->user()->id, $vehicle->id)?->delete();
        }
    }

    private function reserve(array $data, Request $request, ?string &$path): Reservation
    {
        return DB::transaction(function () use ($data, $request, &$path) {
            // lockForUpdate closes the race between two buyers reserving the
            // same car in the same instant — whoever's transaction commits
            // first wins, the second sees status already flipped.
            $vehicle = Vehicle::whereKey($data['vehicle_id'])->lockForUpdate()->firstOrFail();

            if ($vehicle->status !== Vehicle::STATUS_AVAILABLE) {
                throw ValidationException::withMessages([
                    'vehicle_id' => ['This vehicle is no longer available to reserve.'],
                ]);
            }

            $path = ImageShrinker::shrinkStored($request->file('payment_proof')->store('uploads/payment_proofs', 'public'));

            $reservation = Reservation::create([
                'vehicle_id' => $vehicle->id,
                'buyer_id' => $request->user()->id,
                'payment_method' => $data['payment_method'] ?? 'cash',
                'fee_amount' => Setting::get('reservation_fee'),
                'payment_channel' => $data['payment_channel'],
                'payment_reference' => $data['payment_reference'] ?? null,
                'payment_proof_path' => $path,
                'terms_accepted_at' => now(),
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
