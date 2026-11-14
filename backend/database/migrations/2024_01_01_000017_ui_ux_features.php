<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * UI/UX + backlog completion pass:
 *  - settings: business settings that used to be hard-coded or cache-only (global margin,
 *    reservation fee, payment details, loan rates, expansion-fund % and goal, contact info)
 *  - vehicles: buyer-facing specs (transmission, fuel, color, body, description) and the LTO
 *    registration details the Deed of Sale needs (plate, engine/motor, chassis/serial)
 *  - reservations.fee_amount: the reservation fee paid, so the invoice can deduct it (Story 21)
 *  - sales.reservation_id: which verified reservation a sale finalizes ("Record Sale")
 *  - warranty_claims.admin_notes / financing_applications.admin_notes: internal notes (Story 22)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key', 60)->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        // Carry over the margin the CEO already saved (it used to live only in the cache).
        $cachedMargin = Cache::get('settings.global_margin_percent');
        if ($cachedMargin !== null) {
            DB::table('settings')->insert(['key' => 'global_margin_percent', 'value' => (string) $cachedMargin, 'created_at' => now(), 'updated_at' => now()]);
        }

        Schema::table('vehicles', function (Blueprint $table) {
            $table->string('transmission', 20)->nullable()->after('mileage');
            $table->string('fuel_type', 20)->nullable()->after('transmission');
            $table->string('body_type', 30)->nullable()->after('fuel_type');
            $table->string('color', 40)->nullable()->after('body_type');
            $table->text('description')->nullable()->after('color');
            $table->string('plate_number', 20)->nullable()->after('description');
            $table->string('engine_number', 40)->nullable()->after('plate_number');
            $table->string('chassis_number', 40)->nullable()->after('engine_number');
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->decimal('fee_amount', 12, 2)->nullable()->after('payment_method');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('reservation_id')->nullable()->after('buyer_id')->constrained('reservations')->nullOnDelete();
        });

        Schema::table('warranty_claims', function (Blueprint $table) {
            $table->text('admin_notes')->nullable()->after('status');
        });

        Schema::table('financing_applications', function (Blueprint $table) {
            $table->text('admin_notes')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('financing_applications', fn (Blueprint $t) => $t->dropColumn('admin_notes'));
        Schema::table('warranty_claims', fn (Blueprint $t) => $t->dropColumn('admin_notes'));
        Schema::table('sales', function (Blueprint $t) {
            $t->dropConstrainedForeignId('reservation_id');
        });
        Schema::table('reservations', fn (Blueprint $t) => $t->dropColumn('fee_amount'));
        Schema::table('vehicles', fn (Blueprint $t) => $t->dropColumn([
            'transmission', 'fuel_type', 'body_type', 'color', 'description', 'plate_number', 'engine_number', 'chassis_number',
        ]));
        Schema::dropIfExists('settings');
    }
};
