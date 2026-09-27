<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\Request;

/** Public inventory browse/filter + 360-degree viewer detail. No auth required. */
class VehicleController extends Controller
{
    public function index(Request $request)
    {
        $vehicles = Vehicle::query()
            ->with(['media' => fn ($q) => $q->limit(1)])
            ->where('status', Vehicle::STATUS_AVAILABLE)
            ->when($request->filled('make'), fn ($q) => $q->where('make', $request->string('make')))
            ->when($request->filled('model'), fn ($q) => $q->where('model', $request->string('model')))
            ->when($request->filled('min_price'), fn ($q) => $q->where('selling_price', '>=', $request->input('min_price')))
            ->when($request->filled('max_price'), fn ($q) => $q->where('selling_price', '<=', $request->input('max_price')))
            ->latest('last_updated')
            ->paginate(24);

        return response()->json($vehicles);
    }

    /** Vehicle detail + 360 viewer payload, including the "Last Updated" stamp. */
    public function show(Vehicle $vehicle)
    {
        return response()->json($vehicle->load('media'));
    }
}
