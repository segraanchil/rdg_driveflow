<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Product backlog alignment:
 *  - acquisition leads: the appraiser's offer and notes ("Evaluate Acquisition Leads")
 *  - warranty claims: a ticket number ("System logs the claim, generates a ticket")
 *  - admin_notifications: in-app alerts for Admin/CEO ("notifies Admin", "real-time alert")
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('acquisition_leads', function (Blueprint $table) {
            $table->decimal('offer_amount', 12, 2)->nullable()->after('status');
            $table->text('admin_notes')->nullable()->after('offer_amount');
        });

        Schema::table('warranty_claims', function (Blueprint $table) {
            $table->string('ticket_number', 30)->nullable()->unique()->after('id');
        });

        Schema::create('admin_notifications', function (Blueprint $table) {
            $table->id();
            $table->string('audience', 10)->default('admin'); // admin | ceo | both
            $table->string('type', 40);                       // reservation | financing | warranty | test_drive | lead | chat
            $table->string('title');
            $table->string('body')->nullable();
            $table->string('link')->nullable();               // frontend path, e.g. /admin/reservations
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['audience', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_notifications');
        Schema::table('warranty_claims', fn (Blueprint $t) => $t->dropColumn('ticket_number'));
        Schema::table('acquisition_leads', fn (Blueprint $t) => $t->dropColumn(['offer_amount', 'admin_notes']));
    }
};
