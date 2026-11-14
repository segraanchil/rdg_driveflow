<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Vehicle;
use App\Support\BuyerNotice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Reservation & payment proof verification queue. Admin only. */
class ReservationQueueController extends Controller
{
    /** ?status=pending (default) | verified | closed | all */
    public function index(Request $request)
    {
        Reservation::expireOverdue();

        $status = $request->input('status', 'pending');

        $query = Reservation::with(['vehicle.media', 'buyer:id,name,email', 'sale:id,reservation_id,sale_date'])
            ->when($status === 'pending', fn ($q) => $q->where('status', Reservation::STATUS_PENDING)->oldest())
            ->when($status === 'verified', fn ($q) => $q->where('status', Reservation::STATUS_VERIFIED)->oldest())
            ->when($status === 'closed', fn ($q) => $q->whereIn('status', [Reservation::STATUS_REJECTED, Reservation::STATUS_EXPIRED, Reservation::STATUS_COMPLETED])->latest('updated_at'))
            ->when($status === 'all', fn ($q) => $q->latest());

        $page = $query->paginate(50);
        $page->getCollection()->each(fn (Reservation $r) => $r->vehicle?->setRelation('media', $r->vehicle->media->take(1)->values()));

        return response()->json([
            ...$page->toArray(),
            'counts' => [
                'pending' => Reservation::where('status', Reservation::STATUS_PENDING)->count(),
                'verified' => Reservation::where('status', Reservation::STATUS_VERIFIED)->count(),
            ],
        ]);
    }

    public function verify(Reservation $reservation)
    {
        Reservation::expireOverdue();
        $reservation->refresh();

        if ($reservation->status !== Reservation::STATUS_PENDING) {
            throw ValidationException::withMessages(['reservation' => ["This reservation is already {$reservation->status}."]]);
        }

        // The car was already locked (status reserved) when the buyer submitted; verifying
        // confirms the payment proof only.
        $reservation->update(['status' => Reservation::STATUS_VERIFIED]);

        $v = $reservation->vehicle;
        BuyerNotice::send($reservation->buyer, 'Your reservation is confirmed', [
            "We verified your reservation payment for the {$v->year} {$v->make} {$v->model}. The car is reserved for you.",
            'Our staff will contact you to arrange the remaining payment and the release of the car.',
        ], 'View My Garage', '/garage');

        return response()->json($reservation);
    }

    public function reject(Request $request, Reservation $reservation)
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:300']]);

        if (! in_array($reservation->status, [Reservation::STATUS_PENDING, Reservation::STATUS_VERIFIED], true)) {
            throw ValidationException::withMessages(['reservation' => ["This reservation is already {$reservation->status}."]]);
        }

        DB::transaction(function () use ($reservation) {
            $reservation->update(['status' => Reservation::STATUS_REJECTED]);
            $reservation->vehicle()->where('status', Vehicle::STATUS_RESERVED)->update(['status' => Vehicle::STATUS_AVAILABLE, 'last_updated' => now()]);
        });

        $v = $reservation->vehicle;
        BuyerNotice::send($reservation->buyer, 'Your reservation could not be verified', array_filter([
            "We couldn’t verify the reservation payment for the {$v->year} {$v->make} {$v->model}, so the car has been released.",
            ! empty($data['reason']) ? 'Reason: '.$data['reason'] : null,
            'If you believe this is a mistake, reply to this email or visit our showroom with your receipt.',
        ]), 'Browse cars', '/inventory');

        return response()->json($reservation);
    }
}
