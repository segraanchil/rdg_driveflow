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

    protected $fillable = [
        'seller_id',
        'vehicle_specs',
        'photos_path',
        'status',
    ];

    protected $casts = [
        'vehicle_specs' => 'array',
        'photos_path' => 'array',
    ];

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }
}
