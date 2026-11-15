<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/** A "Talk to a person" chat between a visitor (guest or signed-in) and the staff. */
class SupportConversation extends Model
{
    public const STATUS_OPEN = 'open';

    public const STATUS_CLOSED = 'closed';

    protected $fillable = ['user_id', 'guest_token', 'name', 'contact', 'page', 'status', 'assigned_to', 'last_message_at', 'staff_read_at', 'visitor_read_at'];

    protected $hidden = ['guest_token'];

    protected $casts = [
        'last_message_at' => 'datetime',
        'staff_read_at' => 'datetime',
        'visitor_read_at' => 'datetime',
    ];

    public function messages(): HasMany
    {
        return $this->hasMany(SupportMessage::class, 'conversation_id')->orderBy('id');
    }

    /** Newest message from a person (visitor or staff); automatic system lines are skipped. */
    public function lastMessage(): HasOne
    {
        return $this->hasOne(SupportMessage::class, 'conversation_id')
            ->ofMany(['id' => 'max'], fn ($q) => $q->where('sender', '!=', SupportMessage::SENDER_SYSTEM));
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /** Open chats whose newest message from a person is the visitor's (nobody has answered yet). */
    public function scopeWaitingForStaff(Builder $q): Builder
    {
        return $q->where('status', self::STATUS_OPEN)
            ->whereIn('id', SupportMessage::query()
                ->selectRaw('conversation_id')
                ->whereIn('id', SupportMessage::query()->selectRaw('max(id)')->where('sender', '!=', SupportMessage::SENDER_SYSTEM)->groupBy('conversation_id'))
                ->where('sender', SupportMessage::SENDER_VISITOR));
    }

    public function post(string $sender, string $body, ?int $staffId = null): SupportMessage
    {
        $message = $this->messages()->create(['sender' => $sender, 'body' => $body, 'staff_id' => $staffId, 'created_at' => now()]);
        $this->forceFill(['last_message_at' => now()])->save();

        return $message;
    }
}
