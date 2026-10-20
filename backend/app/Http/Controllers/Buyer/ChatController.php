<?php

namespace App\Http\Controllers\Buyer;

use App\Support\AdminAlert;
use App\Http\Controllers\Controller;
use App\Services\Firebase\FirebaseService;
use Illuminate\Http\Request;

/**
 * AI chatbot widget backend. The live message stream itself is read/written
 * directly by the frontend via the Firebase client SDK (see
 * frontend/src/firebase/config.js) — this endpoint just relays a message
 * server-side when an AI reply or escalation needs backend involvement.
 * No login required to chat.
 */
class ChatController extends Controller
{
    public function __construct(private FirebaseService $firebase) {}

    public function sendMessage(Request $request)
    {
        $data = $request->validate([
            'session_id' => ['required', 'string'],
            'text' => ['required', 'string'],
        ]);

        // TODO: call the configured AI provider (config('services.ai_chat')) for an automated reply.
        $this->firebase->pushChatMessage($data['session_id'], [
            'sender' => 'user',
            'text' => $data['text'],
        ]);

        return response()->json(['message' => 'queued']);
    }

    /** Human-agent escalation trigger — flags the session for an admin to pick up. */
    public function escalate(Request $request)
    {
        $data = $request->validate(['session_id' => ['required', 'string']]);

        $this->firebase->pushChatMessage($data['session_id'], [
            'sender' => 'system',
            'text' => 'Escalated to a human agent.',
            'escalated' => true,
        ]);

        // Stored + pushed (Firebase when configured) so an available admin is alerted.
        AdminAlert::notify('chat', 'A visitor wants to talk to a person', 'Chat session ' . substr($data['session_id'], 0, 8) . ' asked for a human agent.', null);

        return response()->json(['message' => 'escalated']);
    }
}
