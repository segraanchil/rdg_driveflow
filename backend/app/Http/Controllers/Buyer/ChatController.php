<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Services\Firebase\FirebaseService;
use App\Support\AdminAlert;
use App\Support\ChatAssistant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Chat widget backend. The assistant answers every message from the live inventory
 * (ChatAssistant) and the reply is returned directly, so the chat works with or without
 * Firebase. When Firebase is configured, messages are also mirrored to /chats/{session}
 * for the realtime human-agent hand-off. No login required to chat.
 */
class ChatController extends Controller
{
    public function __construct(private FirebaseService $firebase, private ChatAssistant $assistant) {}

    public function sendMessage(Request $request)
    {
        $data = $request->validate([
            'session_id' => ['required', 'string', 'max:64'],
            'text' => ['required', 'string', 'max:1000'],
            'page' => ['nullable', 'string', 'max:200'],
        ]);

        $reply = $this->assistant->reply($data['text']);

        $this->firebase->pushChatMessage($data['session_id'], ['sender' => 'user', 'text' => $data['text']]);
        $this->firebase->pushChatMessage($data['session_id'], ['sender' => 'bot', 'text' => $reply['text']]);

        // Story 17: alert staff once per conversation when the visitor shows buying intent.
        if ($reply['high_intent'] && Cache::add("chat.high_intent.{$data['session_id']}", true, now()->addHours(6))) {
            AdminAlert::notify(
                'chat',
                'High-intent buyer in chat',
                '“'.Str::limit($data['text'], 90).'”'.(! empty($data['page']) ? ' (on '.$data['page'].')' : '').' Session '.substr($data['session_id'], 0, 8).'.',
                null,
            );
        }

        return response()->json([
            'reply' => ['sender' => 'bot', 'text' => $reply['text'], 'links' => $reply['links'], 'at' => now()->getTimestampMs()],
        ]);
    }

    /** Human-agent escalation: flags the session for an admin to pick up. */
    public function escalate(Request $request)
    {
        $data = $request->validate([
            'session_id' => ['required', 'string', 'max:64'],
            'name' => ['nullable', 'string', 'max:80'],
            'contact' => ['nullable', 'string', 'max:120'],
            'last_message' => ['nullable', 'string', 'max:500'],
        ]);

        $this->firebase->pushChatMessage($data['session_id'], [
            'sender' => 'system',
            'text' => 'Escalated to a human agent.',
            'escalated' => true,
        ]);

        $who = trim(($data['name'] ?? '').(! empty($data['contact']) ? ' · '.$data['contact'] : ''));
        AdminAlert::notify(
            'chat',
            'A visitor wants to talk to a person',
            ($who !== '' ? "{$who}. " : '').(! empty($data['last_message']) ? '“'.Str::limit($data['last_message'], 80).'” ' : '').'Session '.substr($data['session_id'], 0, 8).'.',
            null,
        );

        return response()->json(['message' => 'escalated']);
    }
}
