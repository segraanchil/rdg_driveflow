<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\VehicleMedia;
use Illuminate\Http\Request;

/** Inventory management with automated 10-18% margin calculation. Admin/CEO only. */
class InventoryController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            Vehicle::with(['media' => fn ($q) => $q->limit(1)])->latest()->paginate(50)
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'make' => ['required', 'string'],
            'model' => ['required', 'string'],
            'year' => ['required', 'integer'],
            'mileage' => ['required', 'integer', 'min:0'],
            'acquisition_cost' => ['required', 'numeric', 'min:0'],
            'repair_fees' => ['nullable', 'numeric', 'min:0'],
            'margin_percent' => ['required', 'numeric', 'min:10', 'max:18'],
            'photos.*' => ['nullable', 'image', 'max:10240'],
        ]);

        $photos = $data['photos'] ?? [];
        unset($data['photos']);

        $data['repair_fees'] ??= 0;
        $data['selling_price'] = $this->calculateSellingPrice(
            $data['acquisition_cost'],
            $data['repair_fees'],
            $data['margin_percent']
        );
        $data['status'] = Vehicle::STATUS_AVAILABLE;
        $data['last_updated'] = now();

        $vehicle = Vehicle::create($data);

        $this->storePhotos($vehicle, $photos);

        return response()->json($vehicle->load('media'), 201);
    }

    public function update(Request $request, Vehicle $vehicle)
    {
        $data = $request->validate([
            'make' => ['sometimes', 'string'],
            'model' => ['sometimes', 'string'],
            'year' => ['sometimes', 'integer'],
            'mileage' => ['sometimes', 'integer', 'min:0'],
            'acquisition_cost' => ['sometimes', 'numeric', 'min:0'],
            'repair_fees' => ['sometimes', 'numeric', 'min:0'],
            'margin_percent' => ['sometimes', 'numeric', 'min:10', 'max:18'],
            'status' => ['sometimes', 'string'],
            'photos.*' => ['nullable', 'image', 'max:10240'],
        ]);

        $photos = $data['photos'] ?? [];
        unset($data['photos']);

        $vehicle->fill($data);

        if ($vehicle->isDirty(['acquisition_cost', 'repair_fees', 'margin_percent'])) {
            $vehicle->selling_price = $this->calculateSellingPrice(
                $vehicle->acquisition_cost,
                $vehicle->repair_fees,
                $vehicle->margin_percent
            );
        }

        $vehicle->last_updated = now();
        $vehicle->save();

        $this->storePhotos($vehicle, $photos);

        return response()->json($vehicle->load('media'));
    }

    public function destroy(Vehicle $vehicle)
    {
        $vehicle->delete();

        return response()->json(null, 204);
    }

    private function calculateSellingPrice(float $acquisitionCost, float $repairFees, float $marginPercent): float
    {
        $cost = $acquisitionCost + $repairFees;

        return round($cost + ($cost * $marginPercent / 100), 2);
    }

    /** Appends uploaded images as ordered 360_frame media, continuing after any existing frames. */
    private function storePhotos(Vehicle $vehicle, array $photos): void
    {
        if (empty($photos)) {
            return;
        }

        $nextOrder = (int) $vehicle->media()->max('sort_order') + 1;

        foreach ($photos as $i => $photo) {
            VehicleMedia::create([
                'vehicle_id' => $vehicle->id,
                'file_path' => $photo->store('uploads/vehicle_media', 'public'),
                'type' => VehicleMedia::TYPE_360_FRAME,
                'sort_order' => $nextOrder + $i,
            ]);
        }
    }
}
