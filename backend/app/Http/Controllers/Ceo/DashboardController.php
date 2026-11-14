<?php

namespace App\Http\Controllers\Ceo;

use App\Http\Controllers\Controller;
use App\Models\AcquisitionLead;
use App\Models\ExpansionFundLedger;
use App\Models\LegalDocument;
use App\Models\Reservation;
use App\Models\Sale;
use App\Models\Setting;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/** Executive dashboard: sales volume, inventory KPIs, expansion fund, recent activity. CEO only. */
class DashboardController extends Controller
{
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

        $fundBalance = (float) (ExpansionFundLedger::orderByDesc('entry_date')->orderByDesc('id')->value('running_balance') ?? 0);
        // Goal is a Business Setting (placeholder until the CEO sets the Service Center budget).
        $goal = (float) Setting::get('expansion_fund_goal');

        return response()->json([
            'inventory' => [
                'available' => Vehicle::where('status', Vehicle::STATUS_AVAILABLE)->count(),
                'reserved' => Vehicle::where('status', Vehicle::STATUS_RESERVED)->count(),
                'sold' => Vehicle::where('status', Vehicle::STATUS_SOLD)->count(),
                'under_repair' => Vehicle::where('status', Vehicle::STATUS_UNDER_REPAIR)->count(),
                'stock_value' => (float) Vehicle::whereIn('status', [Vehicle::STATUS_AVAILABLE, Vehicle::STATUS_RESERVED, Vehicle::STATUS_UNDER_REPAIR])->sum('selling_price'),
            ],
            'sales' => [
                'count_this_month' => $salesThisMonth->count(),
                'total_this_month' => $salesThisMonth->sum('total_amount'),
                'gross_profit_this_month' => $grossProfitThisMonth,
            ],
            'expansion_fund' => [
                'current_balance' => $fundBalance,
                'goal' => $goal,
                'contribution_percent' => (float) Setting::get('expansion_fund_percent'),
                'percent_to_goal' => $goal > 0 ? min(100, round($fundBalance / $goal * 100, 1)) : 0,
            ],
            'monthly' => $this->monthlySeries(6),
            'top_makes' => Sale::join('vehicles', 'vehicles.id', '=', 'sales.vehicle_id')
                ->where('sale_date', '>=', now()->subMonths(5)->startOfMonth())
                ->selectRaw('vehicles.make as make, count(*) as total')->groupBy('vehicles.make')->orderByDesc('total')->take(5)->get(),
            'recent_activity' => $this->recentActivity(),
        ]);
    }

    /** Cars sold, revenue and gross profit for each of the last $months months (oldest first). */
    private function monthlySeries(int $months): array
    {
        $start = now()->subMonths($months - 1)->startOfMonth();
        $sales = Sale::with('vehicle')->where('sale_date', '>=', $start)->get()
            ->groupBy(fn (Sale $s) => $s->sale_date->format('Y-m'));

        return collect(range(0, $months - 1))->map(function (int $i) use ($start, $sales) {
            $month = $start->copy()->addMonths($i);
            $rows = $sales->get($month->format('Y-m'), collect());

            return [
                'month' => $month->format('Y-m'),
                'label' => $month->format('M'),
                'count' => $rows->count(),
                'revenue' => (float) $rows->sum('total_amount'),
                'profit' => (float) $rows->sum(fn (Sale $s) => $s->vehicle ? $s->total_amount - $s->vehicle->acquisition_cost - $s->vehicle->repair_fees : 0),
            ];
        })->all();
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
