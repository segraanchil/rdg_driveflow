<?php

namespace App\Support;

use App\Models\IntendedOwner;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * "Name the car to someone else" requests: the rules and saving shared by the reservation form, the
 * buyer's own owner form (financing page, My Garage) and staff adding an owner for a walk-in buyer.
 */
class OwnerRequests
{
    /** What the buyer fills in. Pass 'required_if:…' to make it depend on another field. */
    public static function buyerRules(string $required = 'required'): array
    {
        return [
            'owner_name' => [$required, 'nullable', 'string', 'min:3', 'max:120'],
            'owner_birthdate' => [$required, 'nullable', 'date_format:Y-m-d', 'after:1900-01-01', 'before_or_equal:'.IntendedOwner::latestBirthdate()],
            'owner_relationship' => [$required, 'nullable', Rule::in(IntendedOwner::RELATIONSHIPS)],
            'owner_license_front' => [$required, 'nullable', 'file', 'image', 'max:10240'],
            'owner_license_back' => ['nullable', 'file', 'image', 'max:10240'],
        ];
    }

    /** The details staff fill in or correct from the license; these print on the Deed of Sale. */
    public static function staffRules(): array
    {
        return [
            'full_name' => ['required', 'string', 'min:3', 'max:120'],
            'birthdate' => ['required', 'date_format:Y-m-d', 'after:1900-01-01', 'before_or_equal:'.IntendedOwner::latestBirthdate()],
            'relationship' => ['required', Rule::in(IntendedOwner::RELATIONSHIPS)],
            'license_number' => ['required', 'string', 'max:40'],
            'license_expiry' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'nationality' => ['required', 'string', 'max:40'],
            'civil_status' => ['nullable', Rule::in(IntendedOwner::CIVIL_STATUSES)],
            'address' => ['required', 'string', 'max:255'],
        ];
    }

    public static function messages(): array
    {
        $required = [
            'owner_name' => 'Enter the new owner’s full name.',
            'owner_birthdate' => 'Enter the new owner’s birthdate.',
            'owner_relationship' => 'Choose how the new owner is related to you.',
            'owner_license_front' => 'Upload the front of the new owner’s driver’s license.',
        ];
        $age = 'The owner named on the Deed of Sale must be at least '.IntendedOwner::MIN_AGE.' years old.';

        return [
            ...collect($required)->mapWithKeys(fn ($m, $f) => ["{$f}.required" => $m, "{$f}.required_if" => $m])->all(),
            'owner_birthdate.before_or_equal' => $age,
            'birthdate.before_or_equal' => $age,
            'owner_license_front.image' => 'The driver’s license must be a photo (JPG or PNG).',
            'owner_license_back.image' => 'The driver’s license must be a photo (JPG or PNG).',
            'owner_license_front.max' => 'The license photo must be 10 MB or smaller.',
            'owner_license_back.max' => 'The license photo must be 10 MB or smaller.',
            'license_expiry.after_or_equal' => 'This driver’s license has expired. Ask the buyer for a valid one.',
        ];
    }

    /** Creates or replaces the buyer's owner request for this car and puts it up for staff validation. */
    public static function submit(User $buyer, Vehicle $vehicle, Request $request): IntendedOwner
    {
        $owner = self::save(IntendedOwner::findFor($buyer->id, $vehicle->id), $request, [
            'buyer_id' => $buyer->id,
            'vehicle_id' => $vehicle->id,
            'full_name' => trim((string) $request->input('owner_name')),
            'birthdate' => $request->input('owner_birthdate'),
            'relationship' => $request->input('owner_relationship'),
            // A new license means every validated detail has to be checked again.
            'license_number' => null, 'license_expiry' => null, 'nationality' => null, 'civil_status' => null, 'address' => null,
            'status' => IntendedOwner::STATUS_PENDING,
            'rejection_reason' => null, 'reviewed_by' => null, 'reviewed_at' => null,
        ]);

        AdminAlert::notify('owner', 'Vehicle owner to validate', "{$buyer->name} wants the {$vehicle->year} {$vehicle->make} {$vehicle->model} named to {$owner->full_name}. Check the driver’s license and fill in the details.", '/admin/vehicle-owners');

        return $owner;
    }

    /** Stores the license photos from the request with these values, removing the photos they replace. */
    public static function save(?IntendedOwner $existing, Request $request, array $values): IntendedOwner
    {
        $old = $existing ? array_filter([$existing->license_front_path, $existing->license_back_path]) : [];

        $owner = $existing ?? new IntendedOwner();
        $owner->fill([
            ...$values,
            'license_front_path' => self::storeLicense($request, 'owner_license_front'),
            'license_back_path' => $request->hasFile('owner_license_back') ? self::storeLicense($request, 'owner_license_back') : null,
        ])->save();

        Storage::disk(IntendedOwner::DISK)->delete($old);

        return $owner;
    }

    /** Streams one side of the license to someone already allowed to see it. */
    public static function licenseResponse(IntendedOwner $owner, string $side)
    {
        $path = $side === 'back' ? $owner->license_back_path : $owner->license_front_path;
        $disk = Storage::disk(IntendedOwner::DISK);
        abort_unless($path && $disk->exists($path), 404);

        return $disk->response($path, null, ['Cache-Control' => 'private, no-store']);
    }

    private static function storeLicense(Request $request, string $field): string
    {
        $path = $request->file($field)->store('owner_licenses', IntendedOwner::DISK);

        return ImageShrinker::shrinkStored($path, IntendedOwner::DISK);
    }
}
