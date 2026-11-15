<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 *  - notifications: Laravel's database notifications, the buyer/seller bell (same events as their emails).
 *  - support_conversations / support_messages: "Talk to a person" in the chat widget. Visitors and
 *    staff (Admin + CEO) chat live through the Support inbox; stored in MySQL and refreshed by polling.
 *  - vehicles.acquisition_lead_id / inspected_at / inspected_by: a car bought through Sell Your Car
 *    enters the inventory as "for inspection" (hidden from the public) until staff inspect it in
 *    person, upload its 360-degree photos and publish it.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('type');
                $table->morphs('notifiable');
                $table->text('data');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
            });
        }

        Schema::create('support_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('guest_token', 64)->unique();          // lets a visitor's browser reopen its own chat
            $table->string('name', 80);
            $table->string('contact', 120)->nullable();         // mobile or email given in the widget
            $table->string('page', 200)->nullable();            // page the visitor was on
            $table->string('status', 10)->default('open');      // open | closed
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamp('staff_read_at')->nullable();     // last time staff opened it
            $table->timestamp('visitor_read_at')->nullable();   // last time the visitor saw staff replies
            $table->timestamps();
            $table->index(['status', 'last_message_at']);
        });

        Schema::create('support_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('support_conversations')->cascadeOnDelete();
            $table->string('sender', 10);                        // visitor | staff | bot | system
            $table->foreignId('staff_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['conversation_id', 'id']);
        });

        Schema::table('vehicles', function (Blueprint $table) {
            $table->foreignId('acquisition_lead_id')->nullable()->after('id')->constrained('acquisition_leads')->nullOnDelete();
            $table->timestamp('inspected_at')->nullable();
            $table->foreignId('inspected_by')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('inspected_by');
            $table->dropConstrainedForeignId('acquisition_lead_id');
            $table->dropColumn('inspected_at');
        });
        Schema::dropIfExists('support_messages');
        Schema::dropIfExists('support_conversations');
        Schema::dropIfExists('notifications');
    }
};
