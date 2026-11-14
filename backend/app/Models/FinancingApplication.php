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

    public const STATUSES = ['pending', 'documents_review', 'approved', 'rejected'];

    // TODO: confirm the exact required documents per profile with the partner bank.
    public const CHECKLISTS = [
        'employed' => ['payslip', 'coe', 'valid_id', 'proof_of_billing'],
        'ofw' => ['coe', 'valid_id', 'proof_of_billing', 'consularized_authorization'],
        'business_owner' => ['dti_or_sec', 'itr', 'valid_id', 'bank_statement'],
    ];

    protected $appends = ['required_documents'];

    protected $fillable = [
        'buyer_id',
        'vehicle_id',
        'employment_profile',
        'term_months',
        'down_payment',
        'monthly_amortization',
        'status',
        'admin_notes',
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

    public function getRequiredDocumentsAttribute(): array
    {
        return self::CHECKLISTS[$this->employment_profile] ?? [];
    }

    public function documents(): HasMany
    {
        return $this->hasMany(FinancingDocument::class, 'application_id');
    }
}
