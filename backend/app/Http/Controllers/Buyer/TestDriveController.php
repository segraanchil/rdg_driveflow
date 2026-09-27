<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Models\TestDrive;
use App\Models\Vehicle;
use Illuminate\Http\Request;

/**
 * Test drive scheduling. Unlike Reservation, this never touches
 * vehicles.status — requesting a slot does not lock the unit, so it can
 * still be reserved or sold to another buyer before the scheduled time.
 */
class TestDriveController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            $request->user()->testDrives()->with('vehicle')->latest('preferred_at')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'vehicle_id' => ['required', 'exists:vehicles,id'],
            'preferred_at' => ['required', 'date', 'after:now'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $vehicle = Vehicle::whereKey($data['vehicle_id'])->firstOrFail();
        abort_unless($vehicle->status === Vehicle::STATUS_AVAILABLE, 422, 'This vehicle is not currently available.');

        $testDrive = TestDrive::create([
            'vehicle_id' => $vehicle->id,
            'buyer_id' => $request->user()->id,
            'preferred_at' => $data['preferred_at'],
            'note' => $data['note'] ?? null,
            'status' => TestDrive::STATUS_PENDING,
        ]);

        return response()->json($testDrive, 201);
    }
}
