<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    use HasFactory;

    public const PAYMENT_CASH = 'cash';

    public const PAYMENT_FINANCING = 'financing';

    protected $fillable = [
        'vehicle_id',
        'buyer_id',
        'reservation_id',
        'intended_owner_id',
        'payment_type',
        'total_amount',
        'sale_date',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'sale_date' => 'date:Y-m-d', // a calendar date, serialized without a time/zone
    ];

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    /** Who the Deed of Sale names when it isn't the buyer (validated by staff); null = the buyer. */
    public function intendedOwner(): BelongsTo
    {
        return $this->belongsTo(IntendedOwner::class);
    }

    public function legalDocuments(): HasMany
    {
        return $this->hasMany(LegalDocument::class);
    }

    public function warrantyClaims(): HasMany
    {
        return $this->hasMany(WarrantyClaim::class);
    }

    public function expansionFundEntries(): HasMany
    {
        return $this->hasMany(ExpansionFundLedger::class);
    }
}
