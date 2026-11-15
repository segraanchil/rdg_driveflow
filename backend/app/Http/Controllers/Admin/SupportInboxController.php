<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use App\Support\BuyerNotice;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Staff side of "Talk to a person" (Admin and CEO): an inbox of visitor chats, a conversation
 * view and replies. Replies show up in the visitor's chat widget within a few seconds; signed-in
 * buyers/sellers also get a bell notification.
 */
class SupportInboxController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->query('status', 'open');
        $like = '%'.addcslashes((string) $request->query('q', ''), '%_\\').'%';

        $rows = SupportConversation::query()
            ->with(['lastMessage', 'assignee:id,name', 'user:id,name,email,role'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($request->filled('q'), fn ($q) => $q->where(fn ($w) => $w->where('name', 'like', $like)->orWhere('contact', 'like', $like)))
            ->orderByDesc('last_message_at')
            ->take(100)
            ->get()
            ->map(fn (SupportConversation $c) => $this->summary($c));

        return response()->json([
            'items' => $rows,
            'counts' => [
                'open' => SupportConversation::where('status', SupportConversation::STATUS_OPEN)->count(),
                'waiting' => SupportConversation::waitingForStaff()->count(),
                'closed' => SupportConversation::where('status', SupportConversation::STATUS_CLOSED)->count(),
            ],
        ]);
    }

    public function show(Request $request, SupportConversation $conversation)
    {
        $conversation->forceFill(['staff_read_at' => now()])->saveQuietly();
        $after = (int) $request->query('after', 0);

        return response()->json([
            'conversation' => $this->summary($conversation->load(['lastMessage', 'assignee:id,name', 'user:id,name,email,role,phone'])) + [
                'page' => $conversation->page,
                'user' => $conversation->user,
                'visitor_read_at' => $conversation->visitor_read_at,
            ],
            'messages' => $conversation->messages()->with('staff:id,name')->when($after, fn ($q) => $q->where('id', '>', $after))->get()
                ->map(fn (SupportMessage $m) => ['id' => $m->id, 'sender' => $m->sender, 'body' => $m->body, 'staff_name' => $m->staff?->name, 'at' => $m->created_at]),
        ]);
    }

    public function reply(Request $request, SupportConversation $conversation)
    {
        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);
        $staff = $request->user();

        if ($conversation->status === SupportConversation::STATUS_CLOSED) {
            $conversation->status = SupportConversation::STATUS_OPEN;
        }
        $conversation->assigned_to ??= $staff->id;
        $conversation->staff_read_at = now();
        $conversation->save();
        $message = $conversation->post(SupportMessage::SENDER_STAFF, $data['body'], $staff->id);

        // Signed-in visitors also get a bell notification (no email: the chat itself is the channel).
        if ($conversation->user) {
            BuyerNotice::send($conversation->user, 'New reply from RDG staff', [\Illuminate\Support\Str::limit($data['body'], 150)], null, '/?chat=open', false);
        }

        return response()->json(['id' => $message->id]);
    }

    public function update(Request $request, SupportConversation $conversation)
    {
        $data = $request->validate(['status' => ['required', Rule::in([SupportConversation::STATUS_OPEN, SupportConversation::STATUS_CLOSED])]]);
        if ($data['status'] !== $conversation->status) {
            $conversation->update($data);
            $conversation->post(SupportMessage::SENDER_SYSTEM, $data['status'] === SupportConversation::STATUS_CLOSED
                ? 'This chat was closed by our staff. Send a message any time to reopen it.'
                : 'Chat reopened by our staff.');
        }

        return response()->json($this->summary($conversation->fresh(['lastMessage', 'assignee:id,name', 'user:id,name,email,role'])));
    }

    private function summary(SupportConversation $c): array
    {
        $last = $c->lastMessage;

        return [
            'id' => $c->id,
            'name' => $c->name,
            'contact' => $c->contact,
            'status' => $c->status,
            'account' => $c->user ? ['name' => $c->user->name, 'email' => $c->user->email, 'role' => $c->user->role] : null,
            'assignee' => $c->assignee?->name,
            'last_message' => $last ? ['sender' => $last->sender, 'body' => \Illuminate\Support\Str::limit($last->body, 120), 'at' => $last->created_at] : null,
            'waiting' => $c->status === SupportConversation::STATUS_OPEN && $last?->sender === SupportMessage::SENDER_VISITOR,
            'unread' => $last && $last->sender === SupportMessage::SENDER_VISITOR && (! $c->staff_read_at || $last->created_at > $c->staff_read_at),
            'last_message_at' => $c->last_message_at,
            'created_at' => $c->created_at,
        ];
    }
}
