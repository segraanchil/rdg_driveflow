<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminNotification extends Model
{
    protected $fillable = ['audience', 'actor_id', 'type', 'title', 'body', 'link', 'read_at'];

    protected $casts = ['read_at' => 'datetime'];

    /** Notifications a given role should see. */
    public function scopeFor($query, string $role)
    {
        return $query->whereIn('audience', [$role, 'both']);
    }
}
