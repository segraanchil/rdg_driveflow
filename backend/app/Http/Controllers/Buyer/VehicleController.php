<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Vehicle;
use Illuminate\Http\Request;

/** Public inventory browse/filter + 360-degree viewer detail. No auth required. */
class VehicleController extends Controller
{
    private const SORTS = [
        'newest' => ['last_updated', 'desc'],
        'price_asc' => ['selling_price', 'asc'],
        'price_desc' => ['selling_price', 'desc'],
        'mileage_asc' => ['mileage', 'asc'],
        'year_desc' => ['year', 'desc'],
    ];

    public function index(Request $request)
    {
        Reservation::expireOverdue(); // release cars whose 48-hour hold ran out

        $like = fn (string $value) => '%'.addcslashes($value, '%_\\').'%';
        [$sortColumn, $sortDirection] = self::SORTS[$request->input('sort')] ?? self::SORTS['newest'];

        $vehicles = Vehicle::query()
            ->with(['media' => fn ($q) => $q->orderByRaw("type = 'photo' desc")->orderBy('sort_order')])
            ->withCount(['media as frames_count' => fn ($q) => $q->where('type', '360_frame')])
            ->where('status', Vehicle::STATUS_AVAILABLE)
            ->when($request->filled('q'), function ($q) use ($request, $like) {
                foreach (preg_split('/\s+/', trim($request->string('q'))) as $word) {
                    $q->where(fn ($w) => $w->where('make', 'like', $like($word))
                        ->orWhere('model', 'like', $like($word))
                        ->orWhere('year', $word));
                }
            })
            ->when($request->filled('make'), fn ($q) => $q->where('make', 'like', $like($request->string('make'))))
            ->when($request->filled('model'), fn ($q) => $q->where('model', 'like', $like($request->string('model'))))
            ->when($request->filled('min_price'), fn ($q) => $q->where('selling_price', '>=', (float) $request->input('min_price')))
            ->when($request->filled('max_price'), fn ($q) => $q->where('selling_price', '<=', (float) $request->input('max_price')))
            ->when($request->filled('min_year'), fn ($q) => $q->where('year', '>=', (int) $request->input('min_year')))
            ->when($request->filled('max_mileage'), fn ($q) => $q->where('mileage', '<=', (int) $request->input('max_mileage')))
            ->when($request->filled('transmission'), fn ($q) => $q->where('transmission', $request->string('transmission')))
            ->when($request->filled('fuel_type'), fn ($q) => $q->where('fuel_type', $request->string('fuel_type')))
            ->when($request->filled('body_type'), fn ($q) => $q->where('body_type', $request->string('body_type')))
            ->orderBy($sortColumn, $sortDirection)
            ->orderByDesc('id')
            ->paginate(min(48, max(6, (int) $request->input('per_page', 12))));

        // Cards only need a cover photo, not the full frame set.
        $vehicles->getCollection()->each(fn (Vehicle $v) => $v->setRelation('media', $v->media->take(1)->values()));

        return response()->json($vehicles);
    }

    /** Filter options for the inventory page, built from what is actually on the lot. */
    public function facets()
    {
        $available = Vehicle::where('status', Vehicle::STATUS_AVAILABLE);
        $distinct = fn (string $column) => (clone $available)->whereNotNull($column)->where($column, '!=', '')
            ->distinct()->orderBy($column)->pluck($column)->values();

        return response()->json([
            'makes' => $distinct('make'),
            'transmissions' => $distinct('transmission'),
            'fuel_types' => $distinct('fuel_type'),
            'body_types' => $distinct('body_type'),
            'price' => ['min' => (float) (clone $available)->min('selling_price'), 'max' => (float) (clone $available)->max('selling_price')],
            'years' => ['min' => (int) (clone $available)->min('year'), 'max' => (int) (clone $available)->max('year')],
            'total' => (clone $available)->count(),
        ]);
    }

    /** Vehicle detail + 360 viewer payload, including the "Last Updated" stamp and similar cars. */
    public function show(Vehicle $vehicle)
    {
        // Cars bought from sellers stay private until staff inspect and publish them.
        abort_if($vehicle->status === Vehicle::STATUS_FOR_INSPECTION, 404);

        Reservation::expireOverdue();
        $vehicle->refresh()->load('media');

        $price = (float) $vehicle->selling_price;
        $similar = Vehicle::query()
            ->with(['media' => fn ($q) => $q->orderByRaw("type = 'photo' desc")->orderBy('sort_order')])
            ->where('status', Vehicle::STATUS_AVAILABLE)
            ->whereKeyNot($vehicle->id)
            ->where(fn ($q) => $q->where('make', $vehicle->make)
                ->orWhereBetween('selling_price', [$price * 0.8, $price * 1.2]))
            ->orderByRaw('make = ? desc', [$vehicle->make])
            ->orderByRaw('ABS(selling_price - ?)', [$price])
            ->take(3)
            ->get()
            ->each(fn (Vehicle $v) => $v->setRelation('media', $v->media->take(1)->values()));

        return response()->json([...$vehicle->toArray(), 'similar' => $similar]);
    }
}
