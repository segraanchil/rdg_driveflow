<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * The person a buyer wants named on the Deed of Sale instead of themselves (e.g. a parent paying
 * for their child's car). The buyer uploads that person's driver's license; staff fill in or correct
 * the details from it and approve, and only then do they print on the Deed of Sale.
 * One per buyer and car. The license photos are private: served only to the buyer and to staff.
 */
class IntendedOwner extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    /** The owner named on the Deed of Sale must be of legal age: 18, i.e. above 17. */
    public const MIN_AGE = 18;

    public const RELATIONSHIPS = ['child', 'spouse', 'parent', 'sibling', 'relative', 'other'];

    public const CIVIL_STATUSES = ['single', 'married', 'widowed', 'separated'];

    /** Private disk (storage/app/private): never reachable through a public /storage link. */
    public const DISK = 'local';

    protected $fillable = [
        'buyer_id', 'vehicle_id', 'relationship', 'full_name', 'birthdate',
        'license_front_path', 'license_back_path',
        'license_number', 'license_expiry', 'nationality', 'civil_status', 'address',
        'status', 'rejection_reason', 'reviewed_by', 'reviewed_at',
    ];

    protected $hidden = ['license_front_path', 'license_back_path'];

    protected $appends = ['has_back', 'age'];

    protected $casts = [
        'birthdate' => 'date:Y-m-d',
        'license_expiry' => 'date:Y-m-d',
        'reviewed_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::deleted(fn (self $owner) => $owner->deleteFiles());
    }

    /** Latest birthdate (Y-m-d) of someone who is already MIN_AGE today. */
    public static function latestBirthdate(): string
    {
        return now()->subYears(self::MIN_AGE)->toDateString();
    }

    public static function findFor(int $buyerId, int $vehicleId): ?self
    {
        return static::where('buyer_id', $buyerId)->where('vehicle_id', $vehicleId)->first();
    }

    /** Owners that still matter: an active reservation or financing application for the car, or a recorded sale. */
    public function scopeRelevant($query)
    {
        $same = fn ($q, string $table) => $q->selectRaw('1')->from($table)
            ->whereColumn("{$table}.buyer_id", 'intended_owners.buyer_id')
            ->whereColumn("{$table}.vehicle_id", 'intended_owners.vehicle_id');

        return $query->where(fn ($w) => $w
            ->whereExists(fn ($q) => $same($q, 'sales'))
            ->orWhere(fn ($open) => $open
                ->whereHas('vehicle', fn ($v) => $v->where('status', '!=', Vehicle::STATUS_SOLD))
                ->where(fn ($o) => $o
                    ->whereExists(fn ($q) => $same($q, 'reservations')->whereIn('reservations.status', [Reservation::STATUS_PENDING, Reservation::STATUS_VERIFIED]))
                    ->orWhereExists(fn ($q) => $same($q, 'financing_applications')->where('financing_applications.status', '!=', 'rejected')))));
    }

    public function getHasBackAttribute(): bool
    {
        return (bool) $this->license_back_path;
    }

    public function getAgeAttribute(): ?int
    {
        return $this->birthdate?->age;
    }

    public function deleteFiles(): void
    {
        Storage::disk(self::DISK)->delete(array_filter([$this->license_front_path, $this->license_back_path]));
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }
}
