<?php

namespace App\Support;

use App\Http\Controllers\Ceo\MarginSettingController;
use App\Models\AcquisitionLead;
use App\Models\Vehicle;
use App\Models\VehicleMedia;
use Illuminate\Support\Facades\Storage;

/**
 * When a seller's car is accepted (online by the seller, or marked accepted by staff), it is added to
 * the inventory as "for inspection": hidden from the public until staff inspect it in person, upload
 * real 360° photos and publish it (Admin → Inventory → Publish). The seller's photos are copied in as
 * reference photos; the offer becomes the acquisition cost and the CEO's margin sets the price.
 */
class LeadToInventory
{
    public static function create(AcquisitionLead $lead): ?Vehicle
    {
        if (Vehicle::where('acquisition_lead_id', $lead->id)->exists()) {
            return null; // already added
        }

        $s = $lead->vehicle_specs ?? [];
        $cost = (float) ($lead->offer_amount ?? 0);
        $margin = MarginSettingController::current();
        $notes = trim(collect([
            $s['condition'] ?? null ? "Condition (seller's rating): {$s['condition']}." : null,
            isset($s['registered_until']) ? "Registered until {$s['registered_until']}." : null,
            ($s['complete_papers'] ?? false) ? 'Complete OR/CR.' : 'Papers incomplete, check before publishing.',
            $s['condition_notes'] ?? null,
        ])->filter()->implode(' '));

        $vehicle = Vehicle::create([
            'acquisition_lead_id' => $lead->id,
            'make' => $s['make'] ?? 'Unknown',
            'model' => $s['model'] ?? 'Unknown',
            'year' => $s['year'] ?? now()->year,
            'mileage' => $s['mileage'] ?? 0,
            'transmission' => $s['transmission'] ?? null,
            'fuel_type' => $s['fuel_type'] ?? null,
            'color' => $s['color'] ?? null,
            'description' => $notes !== '' ? mb_substr($notes, 0, 3000) : null,
            // Decimal columns: pass strings so the money cast doesn't round-trip through floats.
            'acquisition_cost' => number_format($cost, 2, '.', ''),
            'repair_fees' => '0.00',
            'margin_percent' => number_format((float) $margin, 2, '.', ''),
            'selling_price' => number_format(round($cost * (1 + $margin / 100), 2), 2, '.', ''),
            'status' => Vehicle::STATUS_FOR_INSPECTION,
            'last_updated' => now(),
        ]);

        // Seller photos become reference photos (copied, so deleting one never affects the other).
        foreach (array_values($lead->photos_path ?? []) as $i => $path) {
            if (! Storage::disk('public')->exists($path)) {
                continue;
            }
            $copy = 'uploads/vehicle_media/lead'.$lead->id.'-'.$i.'-'.basename($path);
            Storage::disk('public')->copy($path, $copy);
            VehicleMedia::create(['vehicle_id' => $vehicle->id, 'type' => VehicleMedia::TYPE_PHOTO, 'file_path' => $copy, 'sort_order' => $i]);
        }

        AdminAlert::notify('lead', 'New car to inspect', "The {$vehicle->year} {$vehicle->make} {$vehicle->model} was added to Inventory as “For inspection”. Inspect it, upload its 360° photos, then publish it.", '/admin/inventory?status=for_inspection');

        return $vehicle;
    }
}
