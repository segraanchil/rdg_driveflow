<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

/**
 * Business settings (key/value). Replaces values that were hard-coded or cache-only.
 * Every key has a default below, so a fresh install works before the CEO saves anything.
 * Figures marked "placeholder" still need confirming with the business.
 */
class Setting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    private const CACHE_KEY = 'settings.all';

    public const DEFAULTS = [
        // Pricing
        'global_margin_percent' => '12',
        // Reservations / payment (placeholder fee)
        'reservation_fee' => '10000',
        'payment_bank_name' => '',
        'payment_account_name' => 'RDG Car Deals & Services',
        'payment_account_number' => '',
        'payment_ewallet_name' => 'GCash',
        'payment_ewallet_number' => '',
        'payment_qr_path' => '',
        // Loan estimate: annual interest rate per employment profile (placeholders)
        'loan_rate_employed' => '9.5',
        'loan_rate_ofw' => '10.5',
        'loan_rate_business_owner' => '11.5',
        // Expansion fund (placeholders)
        'expansion_fund_percent' => '5',
        'expansion_fund_goal' => '5000000',
        // Contact info shown in the footer, chat assistant and documents
        'business_address' => '143 Commonwealth Avenue, Quezon City, Philippines',
        'business_hours' => 'Mon–Sat, 9:00 AM – 6:00 PM',
        'business_phone' => '',
        'business_email' => '',
    ];

    /** Keys anyone may read (buyer-facing pages). Everything else is staff-only. */
    public const PUBLIC_KEYS = [
        'reservation_fee', 'payment_bank_name', 'payment_account_name', 'payment_account_number',
        'payment_ewallet_name', 'payment_ewallet_number', 'payment_qr_path',
        'loan_rate_employed', 'loan_rate_ofw', 'loan_rate_business_owner',
        'business_address', 'business_hours', 'business_phone', 'business_email',
    ];

    public const NUMERIC_KEYS = [
        'global_margin_percent', 'reservation_fee', 'loan_rate_employed', 'loan_rate_ofw',
        'loan_rate_business_owner', 'expansion_fund_percent', 'expansion_fund_goal',
    ];

    /** @return array<string, string|float> every setting, defaults filled in, numbers cast */
    public static function allValues(): array
    {
        $stored = Cache::rememberForever(self::CACHE_KEY, function () {
            return Schema::hasTable('settings') ? static::query()->pluck('value', 'key')->all() : [];
        });

        $values = array_merge(self::DEFAULTS, array_filter($stored, fn ($v) => $v !== null));

        foreach (self::NUMERIC_KEYS as $key) {
            $values[$key] = (float) $values[$key];
        }

        return $values;
    }

    public static function get(string $key): string|float|null
    {
        return static::allValues()[$key] ?? null;
    }

    public static function put(array $values): void
    {
        foreach ($values as $key => $value) {
            if (! array_key_exists($key, self::DEFAULTS)) {
                continue;
            }
            static::query()->updateOrCreate(['key' => $key], ['value' => $value === null ? '' : (string) $value]);
        }
        Cache::forget(self::CACHE_KEY);
    }

    public static function publicValues(): array
    {
        return array_intersect_key(static::allValues(), array_flip(self::PUBLIC_KEYS));
    }

    /** Annual interest rate (%) used for a buyer's loan estimate. */
    public static function loanRate(?string $profile): float
    {
        $all = static::allValues();

        return (float) ($all["loan_rate_{$profile}"] ?? $all['loan_rate_employed']);
    }
}
