<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password_hash');
            $table->enum('role', ['buyer', 'seller', 'admin', 'ceo'])->default('buyer');
            // Every login (all 4 roles) requires a second factor: a one-time
            // code emailed at login time. mfa_secret holds the hash of the
            // *current* pending code (not a persistent TOTP seed — reused
            // from the ERD's original field rather than renamed), cleared
            // once verified or expired.
            $table->string('mfa_secret')->nullable();
            $table->timestamp('mfa_code_expires_at')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
