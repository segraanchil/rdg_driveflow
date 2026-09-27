<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/** Auto-loan calculator: 12-60 month terms, down payment slider. No auth required. */
class LoanCalculatorController extends Controller
{
    public function calculate(Request $request)
    {
        $data = $request->validate([
            'vehicle_price' => ['required', 'numeric', 'min:0'],
            'down_payment' => ['required', 'numeric', 'min:0'],
            'term_months' => ['required', 'integer', 'min:12', 'max:60'],
            'annual_interest_rate' => ['nullable', 'numeric', 'min:0'],
        ]);

        $principal = $data['vehicle_price'] - $data['down_payment'];
        $annualRate = $data['annual_interest_rate'] ?? 0;
        $monthlyRate = $annualRate / 100 / 12;

        // TODO: confirm amortization formula / rate table with finance team.
        $monthlyAmortization = $monthlyRate > 0
            ? $principal * ($monthlyRate * (1 + $monthlyRate) ** $data['term_months'])
                / ((1 + $monthlyRate) ** $data['term_months'] - 1)
            : $principal / $data['term_months'];

        return response()->json([
            'principal' => round($principal, 2),
            'term_months' => $data['term_months'],
            'monthly_amortization' => round($monthlyAmortization, 2),
        ]);
    }
}
