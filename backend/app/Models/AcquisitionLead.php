<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AcquisitionLead extends Model
{
    use HasFactory;

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_UNDER_APPRAISAL = 'under_appraisal';

    public const STATUS_OFFER_MADE = 'offer_made';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_DECLINED = 'declined';

    /** Accepted or declined: nothing more to do, so the lead can no longer be edited. */
    public const CLOSED = [self::STATUS_ACCEPTED, self::STATUS_DECLINED];

    /**
     * Photo slots on the Sell Your Car form: key => [label, required, max files].
     * The frontend shows one upload box per slot (frontend/src/pages/seller/SellYourCar.jsx).
     */
    public const PHOTO_SLOTS = [
        'front' => ['Front', true, 1],
        'back' => ['Back', true, 1],
        'left' => ['Left side', true, 1],
        'right' => ['Right side', true, 1],
        'odometer' => ['Dashboard / odometer', true, 1],
        'interior' => ['Interior / seats', false, 1],
        'engine' => ['Engine bay', false, 1],
        'trunk' => ['Trunk', false, 1],
        'damage' => ['Dents or scratches', false, 4],
    ];

    protected $fillable = [
        'seller_id',
        'vehicle_specs',
        'photos_path',
        'photo_labels',
        'status',
        'closed_by',
        'offer_amount',
        'admin_notes',
    ];

    protected $casts = [
        'vehicle_specs' => 'array',
        'photos_path' => 'array',
        'photo_labels' => 'array',
        'offer_amount' => 'decimal:2',
    ];

    /** The inventory record created when this car was accepted (see LeadToInventory). */
    public function vehicle(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Vehicle::class, 'acquisition_lead_id');
    }

    public function isClosed(): bool
    {
        return in_array($this->status, self::CLOSED, true);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }
}
