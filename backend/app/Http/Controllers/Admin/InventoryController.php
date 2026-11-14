<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Ceo\MarginSettingController;
use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Vehicle;
use App\Models\VehicleMedia;
use App\Support\ImageShrinker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Inventory management with automated 10-18% margin calculation and vehicle media. Admin only. */
class InventoryController extends Controller
{
    private const TRANSMISSIONS = ['Automatic', 'Manual', 'CVT'];

    private const FUEL_TYPES = ['Gasoline', 'Diesel', 'Hybrid', 'Electric'];

    public function index(Request $request)
    {
        Reservation::expireOverdue();

        $like = fn (string $value) => '%'.addcslashes($value, '%_\\').'%';

        $vehicles = Vehicle::query()
            ->with('media')
            ->withCount([
                'media as frames_count' => fn ($q) => $q->where('type', VehicleMedia::TYPE_360_FRAME),
                'media as photos_count' => fn ($q) => $q->where('type', VehicleMedia::TYPE_PHOTO),
            ])
            ->when($request->filled('q'), fn ($q) => $q->where(fn ($w) => $w
                ->where('make', 'like', $like($request->string('q')))
                ->orWhere('model', 'like', $like($request->string('q')))
                ->orWhere('plate_number', 'like', $like($request->string('q')))))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->latest()
            ->paginate(50);

        $vehicles->getCollection()->each->makeVisible(Vehicle::STAFF_FIELDS);

        return response()->json([
            ...$vehicles->toArray(),
            'status_counts' => Vehicle::selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request, true);
        $photos = $request->file('photos', []);
        $mediaType = $request->input('media_type', VehicleMedia::TYPE_360_FRAME);
        unset($data['photos'], $data['media_type']);

        $data['repair_fees'] ??= 0;
        $data['margin_percent'] ??= MarginSettingController::current(); // CEO's global margin by default
        $data['selling_price'] = $this->calculateSellingPrice($data['acquisition_cost'], $data['repair_fees'], $data['margin_percent']);
        $data['status'] ??= Vehicle::STATUS_AVAILABLE;
        $data['last_updated'] = now();

        $vehicle = Vehicle::create($data);
        $this->storePhotos($vehicle, $photos, $mediaType);

        return response()->json($vehicle->load('media')->makeVisible(Vehicle::STAFF_FIELDS), 201);
    }

    public function update(Request $request, Vehicle $vehicle)
    {
        $data = $this->validated($request, false);
        $photos = $request->file('photos', []);
        $mediaType = $request->input('media_type', VehicleMedia::TYPE_360_FRAME);
        unset($data['photos'], $data['media_type']);
        if (array_key_exists('repair_fees', $data)) {
            $data['repair_fees'] ??= 0;
        }
        if (array_key_exists('margin_percent', $data) && $data['margin_percent'] === null) {
            unset($data['margin_percent']);
        }

        // Reserved/sold status is driven by reservations and sales, not set by hand.
        if (isset($data['status']) && in_array($vehicle->status, [Vehicle::STATUS_RESERVED, Vehicle::STATUS_SOLD], true) && $data['status'] !== $vehicle->status) {
            throw ValidationException::withMessages(['status' => ["This car is {$vehicle->status}; its status changes through the reservation or sale, not here."]]);
        }

        $vehicle->fill($data);

        if ($vehicle->isDirty(['acquisition_cost', 'repair_fees', 'margin_percent'])) {
            $vehicle->selling_price = $this->calculateSellingPrice($vehicle->acquisition_cost, $vehicle->repair_fees, $vehicle->margin_percent);
        }

        $vehicle->last_updated = now();
        $vehicle->save();

        $this->storePhotos($vehicle, $photos, $mediaType);

        return response()->json($vehicle->load('media')->makeVisible(Vehicle::STAFF_FIELDS));
    }

    public function destroy(Vehicle $vehicle)
    {
        // Deleting a sold car would cascade-delete its sale, invoice and legal documents.
        if ($vehicle->sales()->exists()) {
            throw ValidationException::withMessages(['vehicle' => ['This car has a recorded sale, so it can’t be deleted. Its sale and documents must stay on file.']]);
        }
        if ($vehicle->reservations()->whereIn('status', [Reservation::STATUS_PENDING, Reservation::STATUS_VERIFIED])->exists()) {
            throw ValidationException::withMessages(['vehicle' => ['This car has an active reservation. Reject or finish it first.']]);
        }

        foreach ($vehicle->media as $media) {
            Storage::disk('public')->delete($media->file_path);
        }
        $vehicle->delete();

        return response()->json(null, 204);
    }

    /** Removes one photo / 360 frame. */
    public function destroyMedia(Vehicle $vehicle, VehicleMedia $media)
    {
        abort_unless($media->vehicle_id === $vehicle->id, 404);
        Storage::disk('public')->delete($media->file_path);
        $media->delete();
        $vehicle->update(['last_updated' => now()]);

        return response()->json($vehicle->load('media')->makeVisible(Vehicle::STAFF_FIELDS));
    }

    /** Saves a new display order (and optionally the type) for a vehicle's media. */
    public function reorderMedia(Request $request, Vehicle $vehicle)
    {
        $data = $request->validate([
            'items' => ['required', 'array'],
            'items.*.id' => ['required', 'integer'],
            'items.*.type' => ['nullable', Rule::in([VehicleMedia::TYPE_360_FRAME, VehicleMedia::TYPE_PHOTO])],
        ]);

        foreach (array_values($data['items']) as $i => $item) {
            $vehicle->media()->whereKey($item['id'])->update(array_filter([
                'sort_order' => $i + 1,
                'type' => $item['type'] ?? null,
            ]));
        }
        $vehicle->update(['last_updated' => now()]);

        return response()->json($vehicle->load('media')->makeVisible(Vehicle::STAFF_FIELDS));
    }

    private function validated(Request $request, bool $creating): array
    {
        $required = $creating ? 'required' : 'sometimes';

        return $request->validate([
            'make' => [$required, 'string', 'max:60'],
            'model' => [$required, 'string', 'max:60'],
            'year' => [$required, 'integer', 'min:1980', 'max:'.(now()->year + 1)],
            'mileage' => [$required, 'integer', 'min:0'],
            'acquisition_cost' => [$required, 'numeric', 'min:0'],
            'repair_fees' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'margin_percent' => ['sometimes', 'nullable', 'numeric', 'min:10', 'max:18'],
            'status' => ['sometimes', Rule::in([Vehicle::STATUS_AVAILABLE, Vehicle::STATUS_UNDER_REPAIR, Vehicle::STATUS_RESERVED, Vehicle::STATUS_SOLD])],
            'transmission' => ['sometimes', 'nullable', Rule::in(self::TRANSMISSIONS)],
            'fuel_type' => ['sometimes', 'nullable', Rule::in(self::FUEL_TYPES)],
            'body_type' => ['sometimes', 'nullable', 'string', 'max:30'],
            'color' => ['sometimes', 'nullable', 'string', 'max:40'],
            'description' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'plate_number' => ['sometimes', 'nullable', 'string', 'max:20'],
            'engine_number' => ['sometimes', 'nullable', 'string', 'max:40'],
            'chassis_number' => ['sometimes', 'nullable', 'string', 'max:40'],
            'media_type' => ['sometimes', Rule::in([VehicleMedia::TYPE_360_FRAME, VehicleMedia::TYPE_PHOTO])],
            'photos.*' => ['nullable', 'image', 'max:10240'],
        ]);
    }

    private function calculateSellingPrice(float $acquisitionCost, float $repairFees, float $marginPercent): float
    {
        $cost = $acquisitionCost + $repairFees;

        return round($cost + ($cost * $marginPercent / 100), 2);
    }

    /** Appends uploaded images in order, after any existing media. */
    private function storePhotos(Vehicle $vehicle, array $photos, string $type): void
    {
        if (empty($photos)) {
            return;
        }

        $nextOrder = (int) $vehicle->media()->max('sort_order') + 1;

        foreach (array_values($photos) as $i => $photo) {
            VehicleMedia::create([
                'vehicle_id' => $vehicle->id,
                'file_path' => ImageShrinker::shrinkStored($photo->store('uploads/vehicle_media', 'public')),
                'type' => $type,
                'sort_order' => $nextOrder + $i,
            ]);
        }
    }
}
