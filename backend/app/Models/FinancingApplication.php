<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinancingApplication extends Model
{
    use HasFactory;

    public const PROFILE_EMPLOYED = 'employed';

    public const PROFILE_OFW = 'ofw';

    public const PROFILE_BUSINESS_OWNER = 'business_owner';

    protected $fillable = [
        'buyer_id',
        'vehicle_id',
        'employment_profile',
        'term_months',
        'down_payment',
        'monthly_amortization',
        'status',
    ];

    protected $casts = [
        'down_payment' => 'decimal:2',
        'monthly_amortization' => 'decimal:2',
    ];

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(FinancingDocument::class, 'application_id');
    }
}
