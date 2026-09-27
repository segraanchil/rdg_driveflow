<?php

namespace App\Http\Controllers\Ceo;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Global profit margin setting (10-18%), used as InventoryController's
 * default when adding a vehicle without an explicit per-vehicle override.
 *
 * TODO: the ERD has no settings table — this is cached for now. Promote to
 * a real `settings` table/migration if it needs to survive a cache flush
 * or be audited.
 */
class MarginSettingController extends Controller
{
    private const CACHE_KEY = 'settings.global_margin_percent';

    private const DEFAULT_MARGIN = 12.0;

    public function show(Request $request)
    {
        return response()->json(['margin_percent' => Cache::get(self::CACHE_KEY, self::DEFAULT_MARGIN)]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'margin_percent' => ['required', 'numeric', 'min:10', 'max:18'],
        ]);

        Cache::forever(self::CACHE_KEY, $data['margin_percent']);

        return response()->json(['margin_percent' => $data['margin_percent']]);
    }
}
