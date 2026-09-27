<?php

namespace App\Http\Controllers\Ceo;

use App\Http\Controllers\Controller;
use App\Models\ExpansionFundLedger;
use Illuminate\Http\Request;

/** Expansion Fund balance tracker. CEO only. */
class ExpansionFundController extends Controller
{
    public function index(Request $request)
    {
        $latest = ExpansionFundLedger::latest('entry_date')->first();

        return response()->json([
            'current_balance' => $latest?->running_balance ?? 0,
            'entries' => ExpansionFundLedger::with('sale')->latest('entry_date')->paginate(50),
        ]);
    }
}
