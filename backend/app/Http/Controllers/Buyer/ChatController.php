<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use Illuminate\Validation\Rule;
use App\Services\Firebase\FirebaseService;
use App\Support\AdminAlert;
use App\Support\ChatAssistant;
use Illuminate\Http\Request;
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
            // The chat so far (from the widget), so a flagged chat can be shown to staff in full.
            'history' => ['nullable', 'array', 'max:20'],
            'history.*.sender' => ['required', Rule::in(['user', 'bot'])],
            'history.*.text' => ['required', 'string', 'max:2000'],
        ]);

        $reply = $this->assistant->reply($data['text']);

        $this->firebase->pushChatMessage($data['session_id'], ['sender' => 'user', 'text' => $data['text']]);
        $this->firebase->pushChatMessage($data['session_id'], ['sender' => 'bot', 'text' => $reply['text']]);

        $conversation = SupportConversation::where('assistant_session', $data['session_id'])->first();
        $linked = null;

        if ($conversation) {
            // Already flagged: keep the staff copy of this chat up to date.
            $conversation->post(SupportMessage::SENDER_VISITOR, $data['text'], null, true);
            $conversation->post(SupportMessage::SENDER_BOT, $reply['text'], null, true);
            if ($reply['high_intent']) {
                $conversation->post(SupportMessage::SENDER_SYSTEM, 'Buying signal: '.$this->quote($reply['intent_terms']).'.', null, true);
            }
        } elseif ($reply['high_intent']) {
            // Story 17: first buying signal in this chat → save the conversation for staff and alert them once.
            // (The saved conversation is what marks the chat as flagged, so later messages append to it
            // instead of raising a new alert.)
            $conversation = $this->flag($request, $data, $reply);
            $linked = ['id' => $conversation->id, 'token' => $conversation->guest_token];
            AdminAlert::notify(
                'chat',
                'High-intent buyer in chat',
                $conversation->name.': “'.Str::limit($data['text'], 80).'” · said '.$this->quote($reply['intent_terms']).(! empty($data['page']) ? ' on '.$data['page'] : '').'.',
                "/admin/support?c={$conversation->id}",
                'both',
            );
        }

        return response()->json([
            'reply' => ['sender' => 'bot', 'text' => $reply['text'], 'links' => $reply['links'], 'at' => now()->getTimestampMs()],
            // The widget links this to its Staff chat tab, so a staff reply reaches the visitor.
            'support' => $linked,
        ]);
    }

    /** Saves a flagged assistant chat as a Support Chat conversation (transcript + why it was flagged). */
    private function flag(Request $request, array $data, array $reply): SupportConversation
    {
        $user = $request->user('sanctum');
        $conversation = SupportConversation::create([
            'user_id' => $user?->id,
            'guest_token' => Str::random(48),
            'name' => $user?->name ?? 'Website visitor',
            'contact' => $user ? ($user->phone ?: $user->email) : null,
            'page' => $data['page'] ?? null,
            'source' => 'assistant',
            'assistant_session' => $data['session_id'],
            'status' => SupportConversation::STATUS_OPEN,
        ]);

        $conversation->post(SupportMessage::SENDER_SYSTEM, 'Chat with the RDG assistant'.(! empty($data['page']) ? " (started on {$data['page']})" : '').'. Earlier messages:', null, true);
        foreach ($data['history'] ?? [] as $line) {
            $conversation->post($line['sender'] === 'user' ? SupportMessage::SENDER_VISITOR : SupportMessage::SENDER_BOT, $line['text'], null, true);
        }
        $conversation->post(SupportMessage::SENDER_VISITOR, $data['text'], null, true);
        $conversation->post(SupportMessage::SENDER_BOT, $reply['text'], null, true);
        $conversation->post(SupportMessage::SENDER_SYSTEM,
            'Flagged as a high-intent buyer because the visitor wrote '.$this->quote($reply['intent_terms']).'. '
            .($user ? 'Signed in as '.$user->email.'.' : 'Guest (no account, no contact details yet).').' Reply here and it appears in their chat window.', null, true);

        return $conversation;
    }

    /** ['reserve', 'test drive'] → “reserve”, “test drive” */
    private function quote(array $terms): string
    {
        return collect($terms)->unique()->take(4)->map(fn ($t) => "“{$t}”")->implode(', ');
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
            '/admin/support',
        );

        return response()->json(['message' => 'escalated']);
    }
}
