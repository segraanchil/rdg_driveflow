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

    /**
     * Requirements per employment profile, based on what Philippine banks usually ask for an auto
     * loan (BDO, BPI, Security Bank and similar). Each item: [label, how many, what exactly counts].
     * The partner bank has the final say; adjust here and every screen updates.
     */
    public const CHECKLISTS = [
        'employed' => [
            'valid_id' => ['2 valid government IDs', '2 IDs', ['With photo and signature, not expired: Passport, Driver’s License, UMID / SSS ID, PhilSys National ID, PRC ID, Postal ID or Voter’s ID', 'Upload the front and back of each ID']],
            'payslip' => ['Latest payslips', '3 consecutive months', ['From your current employer, the 3 most recent months', 'Payslips must show your name, the company name and your net pay']],
            'coe' => ['Certificate of Employment with Compensation (COEC)', '1 original', ['Issued by your current employer’s HR within the last 3 months', 'Must state your position, date hired, employment status and monthly gross income']],
            'itr' => ['Income Tax Return', '1 copy', ['BIR Form 2316 (Certificate of Compensation Payment / Tax Withheld) for the latest year, signed by your employer']],
            'proof_of_billing' => ['Proof of billing', '1, latest month', ['In your name, at your current home address, issued within the last 3 months', 'Any of: electricity (Meralco), water, landline / internet or postpaid phone bill, or a credit card statement']],
        ],
        'ofw' => [
            'valid_id' => ['2 valid government IDs', '2 IDs (1 must be your passport)', ['Passport photo page, plus one more: Driver’s License, UMID / SSS ID, PhilSys National ID or PRC ID']],
            'coe' => ['Employment contract', '1 current copy', ['DMW / POEA-verified employment contract, or a Certificate of Employment from your foreign employer stating position, salary and contract period']],
            'remittance_proof' => ['Proof of remittance', 'Latest 3 months', ['Remittance receipts or bank statements showing your regular remittances to the Philippines']],
            'consularized_authorization' => ['Special Power of Attorney (SPA)', '1 original', ['Consularized or apostilled, naming your attorney-in-fact in the Philippines who will sign the loan documents for you']],
            'attorney_valid_id' => ['Valid IDs of your attorney-in-fact', '2 IDs', ['Government-issued IDs with photo and signature, front and back']],
            'proof_of_billing' => ['Proof of billing', '1, latest month', ['Philippine address, in your name or your attorney-in-fact’s name, issued within the last 3 months', 'Electricity, water, internet / postpaid bill or a credit card statement']],
        ],
        'business_owner' => [
            'valid_id' => ['2 valid government IDs', '2 IDs', ['With photo and signature, not expired: Passport, Driver’s License, UMID / SSS ID, PhilSys National ID, PRC ID or Postal ID']],
            'dti_or_sec' => ['Business registration', '1 copy', ['Sole proprietor: DTI Certificate of Business Name Registration', 'Corporation / partnership: SEC Certificate of Registration with Articles of Incorporation / Partnership']],
            'business_permit' => ['Mayor’s / Business Permit', 'Current year', ['Issued by the city or municipality where the business operates']],
            'itr' => ['Income Tax Return with Audited Financial Statements', 'Latest 2 years', ['BIR Form 1701 (individual) or 1702 (corporation), BIR-stamped or with eFPS / eBIR proof of filing']],
            'bank_statement' => ['Bank statements', 'Latest 6 months', ['Business or personal account where the business income is deposited']],
            'proof_of_billing' => ['Proof of billing', '1, latest month', ['Home or business address, issued within the last 3 months', 'Electricity, water, internet / postpaid bill or a credit card statement']],
        ],
    ];

    /** The checklist as a list for the API: [{key, label, quantity, details[]}]. */
    public static function requirements(string $profile): array
    {
        return collect(self::CHECKLISTS[$profile] ?? [])
            ->map(fn ($item, $key) => ['key' => $key, 'label' => $item[0], 'quantity' => $item[1], 'details' => $item[2]])
            ->values()
            ->all();
    }

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
        return array_keys(self::CHECKLISTS[$this->employment_profile] ?? []);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(FinancingDocument::class, 'application_id');
    }
}
