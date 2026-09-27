<?php

namespace App\Http\Controllers\Ceo;

use App\Http\Controllers\Controller;
use App\Models\AcquisitionLead;
use App\Models\ExpansionFundLedger;
use App\Models\LegalDocument;
use App\Models\Reservation;
use App\Models\Sale;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/** Executive dashboard: sales volume, inventory KPIs, expansion fund, recent activity. CEO only. */
class DashboardController extends Controller
{
    // Placeholder — no peso figure exists yet for the 2026 Service Center
    // goal, only the target date. Confirm the real number with the CEO.
    private const EXPANSION_FUND_GOAL = 5_000_000;

    public function index(Request $request)
    {
        $salesThisMonth = Sale::with('vehicle')
            ->whereMonth('sale_date', now()->month)
            ->whereYear('sale_date', now()->year)
            ->get();

        $grossProfitThisMonth = $salesThisMonth->sum(
            fn (Sale $sale) => $sale->vehicle
                ? $sale->vehicle->selling_price - $sale->vehicle->acquisition_cost - $sale->vehicle->repair_fees
                : 0
        );

        $fundBalance = (float) (ExpansionFundLedger::latest('entry_date')->first()?->running_balance ?? 0);

        return response()->json([
            'inventory' => [
                'available' => Vehicle::where('status', Vehicle::STATUS_AVAILABLE)->count(),
                'reserved' => Vehicle::where('status', Vehicle::STATUS_RESERVED)->count(),
                'sold' => Vehicle::where('status', Vehicle::STATUS_SOLD)->count(),
            ],
            'sales' => [
                'count_this_month' => $salesThisMonth->count(),
                'total_this_month' => $salesThisMonth->sum('total_amount'),
                'gross_profit_this_month' => $grossProfitThisMonth,
            ],
            'expansion_fund' => [
                'current_balance' => $fundBalance,
                'goal' => self::EXPANSION_FUND_GOAL,
                'percent_to_goal' => self::EXPANSION_FUND_GOAL > 0
                    ? min(100, round($fundBalance / self::EXPANSION_FUND_GOAL * 100, 1))
                    : 0,
            ],
            'recent_activity' => $this->recentActivity(),
        ]);
    }

    private function recentActivity(): Collection
    {
        $documents = LegalDocument::with('sale.vehicle')->latest('generated_at')->take(5)->get()
            ->map(fn (LegalDocument $doc) => [
                'at' => $doc->generated_at,
                'type' => 'document',
                'label' => match ($doc->doc_type) {
                    LegalDocument::TYPE_DEED_OF_SALE => 'Deed of Sale generated'.$this->forVehicle($doc->sale?->vehicle),
                    LegalDocument::TYPE_OFFICIAL_RECEIPT => 'Official Receipt generated'.$this->forVehicle($doc->sale?->vehicle),
                    default => 'Invoice generated'.$this->forVehicle($doc->sale?->vehicle),
                },
            ]);

        $leads = AcquisitionLead::latest()->take(5)->get()
            ->map(fn (AcquisitionLead $lead) => [
                'at' => $lead->created_at,
                'type' => 'lead',
                'label' => 'New appraisal lead: '.($lead->vehicle_specs['year'] ?? '').' '
                    .($lead->vehicle_specs['make'] ?? '').' '.($lead->vehicle_specs['model'] ?? ''),
            ]);

        $reservations = Reservation::with('vehicle')->latest()->take(5)->get()
            ->map(fn (Reservation $r) => [
                'at' => $r->created_at,
                'type' => 'reservation',
                'label' => 'Reservation fee paid'.$this->forVehicle($r->vehicle),
            ]);

        return $documents->concat($leads)->concat($reservations)
            ->sortByDesc('at')
            ->take(8)
            ->values();
    }

    private function forVehicle(?Vehicle $vehicle): string
    {
        return $vehicle ? " for {$vehicle->year} {$vehicle->make} {$vehicle->model}" : '';
    }
}
