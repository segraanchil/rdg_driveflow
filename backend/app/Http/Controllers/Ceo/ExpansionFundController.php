<?php

namespace App\Http\Controllers\Ceo;

use App\Http\Controllers\Controller;
use App\Models\ExpansionFundLedger;
use App\Models\Setting;
use Illuminate\Http\Request;

/** Expansion Fund balance tracker. CEO only. */
class ExpansionFundController extends Controller
{
    public function index(Request $request)
    {
        $balance = (float) (ExpansionFundLedger::orderByDesc('entry_date')->orderByDesc('id')->value('running_balance') ?? 0);
        $goal = (float) Setting::get('expansion_fund_goal');

        return response()->json([
            'current_balance' => $balance,
            'goal' => $goal,
            'percent_to_goal' => $goal > 0 ? min(100, round($balance / $goal * 100, 1)) : 0,
            'contribution_percent' => (float) Setting::get('expansion_fund_percent'),
            'this_month' => (float) ExpansionFundLedger::whereYear('entry_date', now()->year)->whereMonth('entry_date', now()->month)->sum('amount'),
            'entries' => ExpansionFundLedger::with(['sale:id,vehicle_id,buyer_id,total_amount', 'sale.vehicle:id,year,make,model', 'sale.buyer:id,name'])
                ->orderByDesc('entry_date')->orderByDesc('id')->paginate(50),
        ]);
    }
}
