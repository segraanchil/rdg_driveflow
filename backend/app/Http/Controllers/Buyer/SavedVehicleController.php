<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\Request;

/** "My Garage" saved vehicles. */
class SavedVehicleController extends Controller
{
    public function store(Request $request, Vehicle $vehicle)
    {
        $request->user()->savedVehicles()->syncWithoutDetaching([$vehicle->id]);

        return response()->json(['saved' => true], 201);
    }

    public function destroy(Request $request, Vehicle $vehicle)
    {
        $request->user()->savedVehicles()->detach($vehicle->id);

        return response()->json(['saved' => false]);
    }
}
