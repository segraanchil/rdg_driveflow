<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Models\IntendedOwner;
use App\Models\Reservation;
use App\Models\Sale;
use App\Models\Vehicle;
use App\Support\OwnerRequests;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** The buyer's choice of who is named on the Deed of Sale. Auth required. */
class IntendedOwnerController extends Controller
{
    /** ?vehicle_id= → that car's owner request, or null when the Deed will be in the buyer's own name. */
    public function index(Request $request)
    {
        $data = $request->validate(['vehicle_id' => ['required', 'integer']]);

        return response()->json(['owner' => IntendedOwner::findFor($request->user()->id, (int) $data['vehicle_id'])]);
    }

    public function store(Request $request)
    {
        $request->validate(['vehicle_id' => ['required', 'exists:vehicles,id'], ...OwnerRequests::buyerRules()], OwnerRequests::messages());

        $buyer = $request->user();
        $vehicle = Vehicle::findOrFail($request->input('vehicle_id'));
        $this->assertNotSold($buyer->id, $vehicle->id);

        $holds = $buyer->reservations()->where('vehicle_id', $vehicle->id)->whereIn('status', [Reservation::STATUS_PENDING, Reservation::STATUS_VERIFIED])->exists()
            || $buyer->financingApplications()->where('vehicle_id', $vehicle->id)->where('status', '!=', 'rejected')->exists();
        if (! $holds) {
            throw ValidationException::withMessages(['vehicle_id' => ['Reserve this car or apply for financing first.']]);
        }

        return response()->json(OwnerRequests::submit($buyer, $vehicle, $request), 201);
    }

    /** Back to the buyer's own name. */
    public function destroy(Request $request, IntendedOwner $owner)
    {
        $this->authorizeOwner($request, $owner);
        $this->assertNotSold($owner->buyer_id, $owner->vehicle_id);
        $owner->delete();

        return response()->json(null, 204);
    }

    public function license(Request $request, IntendedOwner $owner, string $side)
    {
        $this->authorizeOwner($request, $owner);

        return OwnerRequests::licenseResponse($owner, $side);
    }

    private function authorizeOwner(Request $request, IntendedOwner $owner): void
    {
        abort_unless($owner->buyer_id === $request->user()->id, 403);
    }

    private function assertNotSold(int $buyerId, int $vehicleId): void
    {
        if (Sale::where('buyer_id', $buyerId)->where('vehicle_id', $vehicleId)->exists()) {
            throw ValidationException::withMessages(['vehicle_id' => ['This sale is already recorded. Ask our staff to change the name on the Deed of Sale.']]);
        }
    }
}
