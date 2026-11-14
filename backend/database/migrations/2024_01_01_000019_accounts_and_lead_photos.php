<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Account self-service and Sell Your Car photo slots:
 *  - password_reset_tokens: "Forgot password" links (Laravel's password broker table).
 *  - users.phone: optional mobile number on the profile.
 *  - users.deleted_at: when a buyer/seller deleted their account. The row is anonymised
 *    rather than removed so sales, invoices and other records keep their history.
 *  - acquisition_leads.photo_labels: which slot each photo came from (Front, Back, ...).
 *  - acquisition_leads.closed_by: who closed the lead (seller or staff) once accepted/declined.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 30)->nullable()->after('email');
            $table->timestamp('deleted_at')->nullable()->after('is_active');
        });

        Schema::table('acquisition_leads', function (Blueprint $table) {
            $table->json('photo_labels')->nullable()->after('photos_path');
            $table->string('closed_by', 10)->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('acquisition_leads', function (Blueprint $table) {
            $table->dropColumn(['photo_labels', 'closed_by']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'deleted_at']);
        });
        Schema::dropIfExists('password_reset_tokens');
    }
};
