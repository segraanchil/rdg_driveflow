<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Models\FinancingApplication;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Auto-loan calculator: 12-60 month terms, down payment, and an annual interest rate that
 * depends on the buyer's employment profile (Business Settings; placeholder rates until the
 * partner bank's rate table is confirmed). No auth required.
 */
class LoanCalculatorController extends Controller
{
    public function calculate(Request $request)
    {
        $data = $request->validate([
            'vehicle_price' => ['required', 'numeric', 'min:0'],
            'down_payment' => ['required', 'numeric', 'min:0', 'lte:vehicle_price'],
            'term_months' => ['required', 'integer', 'min:12', 'max:60'],
            'employment_profile' => ['nullable', Rule::in(array_keys(FinancingApplication::CHECKLISTS))],
        ]);

        $rate = Setting::loanRate($data['employment_profile'] ?? null);

        return response()->json([
            ...self::amortize((float) $data['vehicle_price'], (float) $data['down_payment'], (int) $data['term_months'], $rate),
            'term_months' => (int) $data['term_months'],
        ]);
    }

    /** Standard amortizing loan: M = P·r(1+r)^n / ((1+r)^n − 1), r = monthly rate. */
    public static function amortize(float $price, float $downPayment, int $months, float $annualRate): array
    {
        $principal = max(0, $price - $downPayment);
        $r = $annualRate / 100 / 12;
        $monthly = $r > 0 ? $principal * ($r * (1 + $r) ** $months) / ((1 + $r) ** $months - 1) : $principal / $months;

        return [
            'principal' => round($principal, 2),
            'annual_interest_rate' => $annualRate,
            'monthly_amortization' => round($monthly, 2),
            'total_interest' => round($monthly * $months - $principal, 2),
            'total_payable' => round($monthly * $months + $downPayment, 2),
        ];
    }
}
