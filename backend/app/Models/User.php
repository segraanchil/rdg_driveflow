<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLE_BUYER = 'buyer';

    public const ROLE_SELLER = 'seller';

    public const ROLE_ADMIN = 'admin';

    public const ROLE_CEO = 'ceo';

    protected $fillable = [
        'name',
        'email',
        'password_hash',
        'role',
        'mfa_secret',
        'is_active',
    ];

    protected $hidden = [
        'password_hash',
        'mfa_secret',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'mfa_code_expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * The users table stores the password hash as `password_hash` rather
     * than Laravel's default `password` column — point the auth guard at it.
     */
    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isCeo(): bool
    {
        return $this->role === self::ROLE_CEO;
    }

    public function isBuyer(): bool
    {
        return $this->role === self::ROLE_BUYER;
    }

    public function isSeller(): bool
    {
        return $this->role === self::ROLE_SELLER;
    }

    /** Every role must complete an emailed OTP challenge before session is trusted. */
    public function requiresMfa(): bool
    {
        return true;
    }

    /** Generates a fresh 6-digit code, stores its hash, and returns the plain code to email. */
    public function generateMfaCode(): string
    {
        $code = (string) random_int(100000, 999999);

        $this->forceFill([
            'mfa_secret' => Hash::make($code),
            'mfa_code_expires_at' => now()->addMinutes(5),
        ])->save();

        return $code;
    }

    public function verifyMfaCode(string $code): bool
    {
        if (! $this->mfa_secret || ! $this->mfa_code_expires_at || $this->mfa_code_expires_at->isPast()) {
            return false;
        }

        $valid = Hash::check($code, $this->mfa_secret);

        if ($valid) {
            $this->clearMfaCode();
        }

        return $valid;
    }

    public function clearMfaCode(): void
    {
        $this->forceFill(['mfa_secret' => null, 'mfa_code_expires_at' => null])->save();
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class, 'buyer_id');
    }

    public function financingApplications(): HasMany
    {
        return $this->hasMany(FinancingApplication::class, 'buyer_id');
    }

    public function acquisitionLeads(): HasMany
    {
        return $this->hasMany(AcquisitionLead::class, 'seller_id');
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class, 'buyer_id');
    }

    /** "My Garage" saved/favorited vehicles. */
    public function savedVehicles(): BelongsToMany
    {
        return $this->belongsToMany(Vehicle::class, 'saved_vehicles', 'buyer_id', 'vehicle_id')->withTimestamps();
    }

    public function testDrives(): HasMany
    {
        return $this->hasMany(TestDrive::class, 'buyer_id');
    }
}
