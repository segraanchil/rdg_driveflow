<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ExpansionFundLedger;
use App\Models\FinancingApplication;
use App\Models\IntendedOwner;
use App\Models\Reservation;
use App\Models\Sale;
use App\Models\Setting;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * "Record Sale": finalizes a verified reservation (or a walk-in deal) into an official sale —
 * the record invoices and legal documents attach to. Also logs the Expansion Fund entry.
 */
class SaleController extends Controller
{
    public function index(Request $request)
    {
        $like = fn (string $value) => '%'.addcslashes($value, '%_\\').'%';

        return response()->json(
            Sale::with(['vehicle', 'buyer:id,name,email', 'reservation:id,fee_amount,payment_method', 'legalDocuments', 'intendedOwner'])
                ->when($request->filled('q'), fn ($q) => $q->where(fn ($w) => $w
                    ->whereHas('buyer', fn ($b) => $b->where('name', 'like', $like($request->string('q'))))
                    ->orWhereHas('vehicle', fn ($v) => $v->where('make', 'like', $like($request->string('q')))
                        ->orWhere('model', 'like', $like($request->string('q'))))))
                ->latest('sale_date')->latest('id')
                ->paginate(50)
        );
    }

    /** Verified reservations ready to finalize, plus vehicles/buyers for a walk-in sale. */
    public function createOptions(Request $request)
    {
        Reservation::expireOverdue();

        return response()->json([
            'reservations' => Reservation::with(['vehicle', 'buyer:id,name,email'])
                ->readyToSell()
                ->oldest()
                ->get()
                ->map(fn (Reservation $r) => [
                    ...$r->toArray(),
                    'down_payment' => $this->financingDownPayment($r->buyer_id, $r->vehicle_id),
                    'intended_owner' => IntendedOwner::findFor($r->buyer_id, $r->vehicle_id),
                ]),
            'vehicles' => Vehicle::where('status', Vehicle::STATUS_AVAILABLE)->orderBy('make')->orderBy('model')->get(),
            'buyers' => User::where('role', User::ROLE_BUYER)->orderBy('name')->get(['id', 'name', 'email']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'reservation_id' => ['nullable', 'exists:reservations,id'],
            'vehicle_id' => ['required_without:reservation_id', 'nullable', 'exists:vehicles,id'],
            'buyer_id' => ['required_without:reservation_id', 'nullable', Rule::exists('users', 'id')->where('role', User::ROLE_BUYER)],
            'payment_type' => ['required', Rule::in([Sale::PAYMENT_CASH, Sale::PAYMENT_FINANCING])],
            'total_amount' => ['required', 'numeric', 'min:1'],
        ]);

        $sale = DB::transaction(function () use ($data) {
            $reservation = null;
            if (! empty($data['reservation_id'])) {
                $reservation = Reservation::lockForUpdate()->findOrFail($data['reservation_id']);
                if ($reservation->status !== Reservation::STATUS_VERIFIED || $reservation->sale()->exists()) {
                    throw ValidationException::withMessages(['reservation_id' => ['Only a verified reservation that has no sale yet can be finalized.']]);
                }
                $data['vehicle_id'] = $reservation->vehicle_id;
                $data['buyer_id'] = $reservation->buyer_id;
            }

            $vehicle = Vehicle::lockForUpdate()->findOrFail($data['vehicle_id']);
            if ($vehicle->status === Vehicle::STATUS_SOLD) {
                throw ValidationException::withMessages(['vehicle_id' => ['This car is already sold.']]);
            }
            if (! $reservation && $vehicle->status !== Vehicle::STATUS_AVAILABLE) {
                throw ValidationException::withMessages(['vehicle_id' => ['This car is reserved. Finalize it from its verified reservation instead.']]);
            }

            // Someone else named on the Deed of Sale: their license must be validated first. A rejected
            // request falls back to the buyer's own name.
            $owner = IntendedOwner::findFor((int) $data['buyer_id'], $vehicle->id);
            if ($owner?->status === IntendedOwner::STATUS_PENDING) {
                throw ValidationException::withMessages(['vehicle_id' => ["Validate {$owner->full_name} in Vehicle Owners first: the buyer wants the Deed of Sale in that name."]]);
            }

            $sale = Sale::create([
                'vehicle_id' => $vehicle->id,
                'buyer_id' => $data['buyer_id'],
                'reservation_id' => $reservation?->id,
                'intended_owner_id' => $owner?->status === IntendedOwner::STATUS_APPROVED ? $owner->id : null,
                'payment_type' => $data['payment_type'],
                'total_amount' => $data['total_amount'],
                'sale_date' => now()->toDateString(),
            ]);

            $vehicle->update(['status' => Vehicle::STATUS_SOLD, 'last_updated' => now()]);
            $reservation?->update(['status' => Reservation::STATUS_COMPLETED]);

            // Expansion Fund: a set % of each sale (placeholder 5%, set by the CEO in Business Settings).
            $previousBalance = (float) (ExpansionFundLedger::orderByDesc('entry_date')->orderByDesc('id')->value('running_balance') ?? 0);
            $contribution = round((float) $sale->total_amount * Setting::get('expansion_fund_percent') / 100, 2);

            ExpansionFundLedger::create([
                'sale_id' => $sale->id,
                'amount' => $contribution,
                'running_balance' => $previousBalance + $contribution,
                'entry_date' => $sale->sale_date,
            ]);

            return $sale;
        });

        return response()->json($sale->load(['vehicle', 'buyer:id,name,email', 'legalDocuments', 'intendedOwner']), 201);
    }

    /** Down payment from the buyer's latest financing application for this car, if any. */
    public static function financingDownPayment(int $buyerId, int $vehicleId): ?float
    {
        $value = FinancingApplication::where('buyer_id', $buyerId)->where('vehicle_id', $vehicleId)
            ->where('status', '!=', 'rejected')->latest()->value('down_payment');

        return $value === null ? null : (float) $value;
    }
}
