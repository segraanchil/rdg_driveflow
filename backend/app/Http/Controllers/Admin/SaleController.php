<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ExpansionFundLedger;
use App\Models\Sale;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Records a completed sale — the step between a verified reservation and
 * invoice/legal document generation. Also logs an Expansion Fund ledger
 * entry, since every sale contributes to that balance.
 */
class SaleController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(Sale::with(['vehicle', 'buyer'])->latest('sale_date')->paginate(50));
    }

    /** Vehicles + buyers eligible to appear in the "Record Sale" form. */
    public function createOptions(Request $request)
    {
        return response()->json([
            'vehicles' => Vehicle::whereIn('status', [Vehicle::STATUS_AVAILABLE, Vehicle::STATUS_RESERVED])
                ->orderBy('make')->get(),
            'buyers' => User::where('role', User::ROLE_BUYER)->orderBy('name')->get(['id', 'name', 'email']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'vehicle_id' => ['required', 'exists:vehicles,id'],
            'buyer_id' => ['required', 'exists:users,id'],
            'payment_type' => ['required', Rule::in([Sale::PAYMENT_CASH, Sale::PAYMENT_FINANCING])],
            'total_amount' => ['required', 'numeric', 'min:0'],
        ]);

        $sale = DB::transaction(function () use ($data) {
            $sale = Sale::create([
                ...$data,
                'sale_date' => now()->toDateString(),
            ]);

            Vehicle::whereKey($data['vehicle_id'])->update(['status' => Vehicle::STATUS_SOLD, 'last_updated' => now()]);

            // TODO: confirm the expansion-fund contribution formula (e.g. % of margin) with the CEO.
            $previousBalance = ExpansionFundLedger::latest('entry_date')->value('running_balance') ?? 0;
            $contribution = round($sale->total_amount * 0.05, 2);

            ExpansionFundLedger::create([
                'sale_id' => $sale->id,
                'amount' => $contribution,
                'running_balance' => $previousBalance + $contribution,
                'entry_date' => $sale->sale_date,
            ]);

            return $sale;
        });

        return response()->json($sale, 201);
    }
}
