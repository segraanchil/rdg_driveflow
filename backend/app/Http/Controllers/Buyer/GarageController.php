<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use Illuminate\Http\Request;

/** "My Garage": saved vehicles, active reservations, loan history. Auth required. */
class GarageController extends Controller
{
    public function index(Request $request)
    {
        Reservation::expireOverdue();

        $user = $request->user();

        return response()->json([
            'saved_vehicles' => $user->savedVehicles()->with(['media' => fn ($q) => $q->limit(1)])->get(),
            'active_reservations' => $user->reservations()->with('vehicle')
                ->where('status', '!=', 'expired')->get(),
            'loan_history' => $user->financingApplications()->with('vehicle')->get(),
        ]);
    }
}
