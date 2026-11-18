<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Connects the two tables that stood alone in the ERD:
 *  - admin_notifications.actor_id: the user whose action raised the alert (the buyer who reserved,
 *    the seller who submitted a car, the visitor who started a chat). Null for automatic/guest events.
 *  - settings.updated_by: the CEO account that last changed the setting (audit trail).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admin_notifications', function (Blueprint $table) {
            $table->foreignId('actor_id')->nullable()->after('audience')->constrained('users')->nullOnDelete();
        });
        Schema::table('settings', function (Blueprint $table) {
            $table->foreignId('updated_by')->nullable()->after('value')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('updated_by');
        });
        Schema::table('admin_notifications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('actor_id');
        });
    }
};
