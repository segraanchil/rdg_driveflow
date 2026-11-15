<?php

namespace App\Http\Controllers;

use App\Models\SupportConversation;
use App\Models\SupportMessage;
use App\Support\AdminAlert;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Visitor side of "Talk to a person" (chat widget). No login needed: a guest's browser keeps a
 * random token for its chat; a signed-in buyer/seller can also reopen it from any device.
 * Messages are stored in MySQL and the widget checks for new ones every few seconds.
 */
class SupportChatController extends Controller
{
    public function start(Request $request)
    {
        $user = $request->user('sanctum');
        $data = $request->validate([
            'name' => [$user ? 'nullable' : 'required', 'string', 'max:80'],
            'contact' => [$user ? 'nullable' : 'required', 'string', 'max:120'],
            'message' => ['required', 'string', 'max:2000'],
            'page' => ['nullable', 'string', 'max:200'],
        ], ['contact.required' => 'Add your mobile number or email so we can reach you if you leave the chat.']);

        $conversation = SupportConversation::create([
            'user_id' => $user?->id,
            'guest_token' => Str::random(48),
            'name' => ($data['name'] ?? null) ?: ($user?->name ?? 'Visitor'),
            'contact' => ($data['contact'] ?? null) ?: ($user?->phone ?: $user?->email),
            'page' => $data['page'] ?? null,
            'status' => SupportConversation::STATUS_OPEN,
        ]);
        $conversation->post(SupportMessage::SENDER_VISITOR, $data['message']);
        $conversation->post(SupportMessage::SENDER_SYSTEM, 'You’re now in the queue. A staff member will reply here as soon as possible (showroom hours apply). You can close this window; we’ll keep your chat.');

        AdminAlert::notify('chat', 'Someone wants to talk to a person', $conversation->name.': “'.Str::limit($data['message'], 90).'”', "/admin/support?c={$conversation->id}", 'both');

        return response()->json($this->payload($conversation, null) + ['token' => $conversation->guest_token], 201);
    }

    /** New messages since `after` (message id). */
    public function show(Request $request, SupportConversation $conversation)
    {
        $this->authorizeVisitor($request, $conversation);
        $conversation->forceFill(['visitor_read_at' => now()])->saveQuietly();

        return response()->json($this->payload($conversation, (int) $request->query('after', 0)));
    }

    public function send(Request $request, SupportConversation $conversation)
    {
        $this->authorizeVisitor($request, $conversation);
        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        if ($conversation->status === SupportConversation::STATUS_CLOSED) {
            $conversation->update(['status' => SupportConversation::STATUS_OPEN]);
            $conversation->post(SupportMessage::SENDER_SYSTEM, 'Chat reopened.');
            AdminAlert::notify('chat', 'A closed chat was reopened', $conversation->name.': “'.Str::limit($data['body'], 90).'”', "/admin/support?c={$conversation->id}", 'both');
        }
        $conversation->post(SupportMessage::SENDER_VISITOR, $data['body']);

        return response()->json($this->payload($conversation, (int) $request->input('after', 0)));
    }

    /** A signed-in buyer/seller's latest chat, so they can continue it on another device. */
    public function mine(Request $request)
    {
        $conversation = SupportConversation::where('user_id', $request->user()->id)->latest('last_message_at')->first();

        return response()->json($conversation ? $this->payload($conversation, null) + ['token' => $conversation->guest_token] : null);
    }

    private function authorizeVisitor(Request $request, SupportConversation $conversation): void
    {
        $token = (string) $request->header('X-Support-Token', '');
        $user = $request->user('sanctum');
        $ok = ($token !== '' && hash_equals($conversation->guest_token, $token)) || ($user && $conversation->user_id === $user->id);
        abort_unless($ok, 403, 'This chat belongs to someone else.');
    }

    private function payload(SupportConversation $conversation, ?int $after): array
    {
        $messages = $conversation->messages()->with('staff:id,name')
            ->when($after, fn ($q) => $q->where('id', '>', $after))
            ->get()
            ->map(fn (SupportMessage $m) => [
                'id' => $m->id,
                'sender' => $m->sender,
                'body' => $m->body,
                'staff_name' => $m->staff ? explode(' ', $m->staff->name)[0] : null,
                'at' => $m->created_at,
            ]);

        return [
            'conversation' => ['id' => $conversation->id, 'status' => $conversation->status, 'name' => $conversation->name],
            'messages' => $messages,
        ];
    }
}
