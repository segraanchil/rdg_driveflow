<?php

namespace App\Http\Controllers\Ceo;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\Vehicle;
use Illuminate\Http\Request;

/**
 * Global profit margin setting (10-18%). Stored in the `settings` table (it used to live
 * only in the cache). Saving it re-prices every car still for sale; reserved and sold cars
 * keep the price the buyer agreed to. New cars use it as their default margin.
 */
class MarginSettingController extends Controller
{
    public static function current(): float
    {
        return (float) Setting::get('global_margin_percent');
    }

    public function show(Request $request)
    {
        return response()->json(['margin_percent' => self::current()]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'margin_percent' => ['required', 'numeric', 'min:10', 'max:18'],
        ]);

        Setting::put(['global_margin_percent' => $data['margin_percent']]);

        $repriced = 0;
        Vehicle::where('status', Vehicle::STATUS_AVAILABLE)->get()->each(function (Vehicle $v) use ($data, &$repriced) {
            $cost = (float) $v->acquisition_cost + (float) $v->repair_fees;
            $v->update([
                'margin_percent' => $data['margin_percent'],
                'selling_price' => round($cost + $cost * $data['margin_percent'] / 100, 2),
                'last_updated' => now(),
            ]);
            $repriced++;
        });

        return response()->json(['margin_percent' => (float) $data['margin_percent'], 'repriced' => $repriced]);
    }
}
