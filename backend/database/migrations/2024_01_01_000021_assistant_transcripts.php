<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * High-intent assistant chats become Support Chat conversations, so staff can read why a visitor
 * was flagged and reply:
 *  - support_conversations.source: 'visitor' (Talk to a person) or 'assistant' (flagged by the bot)
 *  - support_conversations.assistant_session: the chat widget's session id, to keep appending to it
 *  - support_messages.from_assistant: lines copied from the assistant chat (staff see them; the
 *    visitor already has them in the Assistant tab, so they are not repeated in the Staff tab)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_conversations', function (Blueprint $table) {
            $table->string('source', 12)->default('visitor')->after('page');
            $table->string('assistant_session', 64)->nullable()->after('source')->index();
        });
        Schema::table('support_messages', function (Blueprint $table) {
            $table->boolean('from_assistant')->default(false)->after('body');
        });
    }

    public function down(): void
    {
        Schema::table('support_messages', function (Blueprint $table) {
            $table->dropColumn('from_assistant');
        });
        Schema::table('support_conversations', function (Blueprint $table) {
            $table->dropIndex(['assistant_session']);
            $table->dropColumn(['source', 'assistant_session']);
        });
    }
};
