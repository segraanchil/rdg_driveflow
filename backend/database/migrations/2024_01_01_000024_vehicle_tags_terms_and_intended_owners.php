<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 *  - vehicles.tags: short selling points shown under a car's specs (LADY OWNED, CASA MAINTAINED, …)
 *  - reservations.terms_accepted_at: when the buyer agreed to the reservation terms
 *  - intended_owners: the person a buyer wants named on the Deed of Sale instead of themselves
 *    (their child, spouse, …), with their driver's license and the details staff validated from it
 *  - sales.intended_owner_id: the validated owner printed on this sale's Deed of Sale
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->json('tags')->nullable()->after('features');
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->timestamp('terms_accepted_at')->nullable()->after('payment_proof_path');
        });

        Schema::create('intended_owners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('vehicle_id')->constrained('vehicles')->cascadeOnDelete();
            $table->string('relationship', 20);
            $table->string('full_name', 120);
            $table->date('birthdate');
            $table->string('license_front_path');
            $table->string('license_back_path')->nullable();
            // Filled in / corrected by staff from the license.
            $table->string('license_number', 40)->nullable();
            $table->date('license_expiry')->nullable();
            $table->string('nationality', 40)->nullable();
            $table->string('civil_status', 20)->nullable();
            $table->string('address', 255)->nullable();
            $table->string('status', 20)->default('pending');
            $table->string('rejection_reason', 300)->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->unique(['buyer_id', 'vehicle_id']);
            $table->index('status');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('intended_owner_id')->nullable()->after('reservation_id')->constrained('intended_owners')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('intended_owner_id');
        });
        Schema::dropIfExists('intended_owners');
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn('terms_accepted_at');
        });
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn('tags');
        });
    }
};
