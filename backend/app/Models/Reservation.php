<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Reservation extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_VERIFIED = 'verified';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_COMPLETED = 'completed';

    protected $fillable = [
        'vehicle_id',
        'buyer_id',
        'payment_method',
        'fee_amount',
        'payment_channel',
        'payment_reference',
        'payment_proof_path',
        'terms_accepted_at',
        'status',
        'expires_at',
    ];

    protected $casts = [
        'terms_accepted_at' => 'datetime',
        'expires_at' => 'datetime',
        'fee_amount' => 'decimal:2',
    ];

    /** Verified, not yet finalized into a sale, and the car isn't sold some other way (e.g. an older walk-in sale). */
    public function scopeReadyToSell($query)
    {
        return $query->where('status', self::STATUS_VERIFIED)
            ->whereDoesntHave('sale')
            ->whereHas('vehicle', fn ($v) => $v->where('status', '!=', Vehicle::STATUS_SOLD));
    }

    /** The sale that finalized this reservation (Record Sale), if any. */
    public function sale(): HasOne
    {
        return $this->hasOne(Sale::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    /**
     * Flips any reservation whose 48h window lapsed without admin
     * verification back to available — called lazily wherever reservations
     * are read (no queue worker in this deployment to run it on a
     * schedule). Returns how many were expired, for the artisan command.
     */
    public static function expireOverdue(): int
    {
        $overdue = static::where('status', self::STATUS_PENDING)
            ->where('expires_at', '<', now())
            ->get();

        foreach ($overdue as $reservation) {
            $reservation->update(['status' => self::STATUS_EXPIRED]);
            $reservation->vehicle()->update(['status' => Vehicle::STATUS_AVAILABLE, 'last_updated' => now()]);
        }

        return $overdue->count();
    }
}
