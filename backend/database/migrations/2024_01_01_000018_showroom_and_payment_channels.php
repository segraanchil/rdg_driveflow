<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Showroom + payment improvements:
 *  - vehicle_media.type becomes a plain string so the showroom can hold exterior 360° frames
 *    (`360_frame`), an interior look-around panorama (`interior_360`) and still photos (`photo`);
 *    `is_sample` marks generated sample media so the UI can label it honestly.
 *  - vehicles: engine, seats, drivetrain and a features list for the spec sheet.
 *  - reservations: which payment channel the buyer used (gcash / bank_transfer) and their
 *    transaction reference number, for manual verification.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicle_media', function (Blueprint $table) {
            $table->string('type', 20)->default('photo')->change();
            $table->boolean('is_sample')->default(false)->after('sort_order');
        });

        Schema::table('vehicles', function (Blueprint $table) {
            $table->string('engine', 30)->nullable()->after('fuel_type');
            $table->unsignedTinyInteger('seats')->nullable()->after('engine');
            $table->string('drivetrain', 10)->nullable()->after('seats');
            $table->text('features')->nullable()->after('description');
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->string('payment_channel', 20)->nullable()->after('payment_method');
            $table->string('payment_reference', 60)->nullable()->after('payment_channel');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', fn (Blueprint $t) => $t->dropColumn(['payment_channel', 'payment_reference']));
        Schema::table('vehicles', fn (Blueprint $t) => $t->dropColumn(['engine', 'seats', 'drivetrain', 'features']));
        Schema::table('vehicle_media', function (Blueprint $table) {
            $table->dropColumn('is_sample');
            $table->enum('type', ['360_frame', 'photo'])->default('360_frame')->change();
        });
    }
};
