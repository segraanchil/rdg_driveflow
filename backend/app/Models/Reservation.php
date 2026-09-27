<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        'payment_proof_path',
        'status',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

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
