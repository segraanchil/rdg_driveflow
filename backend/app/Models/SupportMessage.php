<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportMessage extends Model
{
    public const SENDER_VISITOR = 'visitor';

    public const SENDER_STAFF = 'staff';

    public const SENDER_BOT = 'bot';

    public const SENDER_SYSTEM = 'system';

    public $timestamps = false;

    protected $fillable = ['conversation_id', 'sender', 'staff_id', 'body', 'created_at'];

    protected $casts = ['created_at' => 'datetime'];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(SupportConversation::class, 'conversation_id');
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }
}
