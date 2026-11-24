<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vehicle extends Model
{
    use HasFactory;

    public const STATUS_AVAILABLE = 'available';

    public const STATUS_RESERVED = 'reserved';

    public const STATUS_SOLD = 'sold';

    public const STATUS_UNDER_REPAIR = 'under_repair';

    /** Bought through Sell Your Car; hidden from the public until inspected in person and given 360° photos. */
    public const STATUS_FOR_INSPECTION = 'for_inspection';

    /** Real (non-sample) exterior 360° frames needed before a car bought from a seller can be published. */
    public const MIN_FRAMES_TO_PUBLISH = 8;

    protected $fillable = [
        'acquisition_lead_id',
        'inspected_at',
        'inspected_by',
        'make',
        'model',
        'year',
        'mileage',
        'transmission',
        'fuel_type',
        'engine',
        'seats',
        'drivetrain',
        'features',
        'tags',
        'body_type',
        'color',
        'description',
        'plate_number',
        'engine_number',
        'chassis_number',
        'acquisition_cost',
        'repair_fees',
        'margin_percent',
        'selling_price',
        'status',
        'last_updated',
    ];

    /** Cost/margin and LTO registration details are staff-only; admin endpoints call makeVisible(STAFF_FIELDS). */
    public const STAFF_FIELDS = ['acquisition_cost', 'repair_fees', 'margin_percent', 'plate_number', 'engine_number', 'chassis_number'];

    protected $hidden = self::STAFF_FIELDS;

    protected $casts = [
        'acquisition_cost' => 'decimal:2',
        'repair_fees' => 'decimal:2',
        'margin_percent' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'last_updated' => 'datetime',
        'inspected_at' => 'datetime',
        'tags' => 'array',
    ];

    /** Short selling points under the specs, e.g. LADY OWNED, CASA MAINTAINED. */
    public const MAX_TAGS = 6;

    public const MAX_TAG_LENGTH = 30;

    /** Upper-cased, trimmed, no blanks or duplicates; null when there are none. */
    public static function cleanTags(?array $tags): ?array
    {
        $clean = collect($tags)
            ->map(fn ($t) => mb_strtoupper(trim(preg_replace('/\s+/', ' ', (string) $t))))
            ->filter()->unique()->values()->take(self::MAX_TAGS)->all();

        return $clean ?: null;
    }

    public function acquisitionLead(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(AcquisitionLead::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function financingApplications(): HasMany
    {
        return $this->hasMany(FinancingApplication::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    /** 360 rotation frames + still photos, in display order. */
    public function media(): HasMany
    {
        return $this->hasMany(VehicleMedia::class)->orderBy('sort_order');
    }

    public function savedByBuyers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'saved_vehicles', 'vehicle_id', 'buyer_id')->withTimestamps();
    }

    public function testDrives(): HasMany
    {
        return $this->hasMany(TestDrive::class);
    }
}
