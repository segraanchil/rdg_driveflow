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

    protected $fillable = [
        'make',
        'model',
        'year',
        'mileage',
        'acquisition_cost',
        'repair_fees',
        'margin_percent',
        'selling_price',
        'status',
        'last_updated',
    ];

    protected $casts = [
        'acquisition_cost' => 'decimal:2',
        'repair_fees' => 'decimal:2',
        'margin_percent' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'last_updated' => 'datetime',
    ];

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
