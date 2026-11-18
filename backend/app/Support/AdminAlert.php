<?php

namespace App\Support;

use App\Models\AdminNotification;
use App\Services\Firebase\FirebaseService;

/**
 * Alerts staff about something that needs attention. Always stored in MySQL (shown in the
 * admin panel's bell, refreshed every minute); also pushed to Firebase for instant delivery
 * when Firebase is configured. A failure here never blocks the buyer's/seller's action.
 */
class AdminAlert
{
    public static function notify(string $type, string $title, ?string $body = null, ?string $link = null, string $audience = 'admin'): void
    {
        try {
            // actor_id: whoever's request raised the alert (buyer, seller, signed-in visitor); null for guests.
            $actor_id = request()?->user('sanctum')?->id ?? auth()->id();
            AdminNotification::create(compact('audience', 'actor_id', 'type', 'title', 'body', 'link'));
            app(FirebaseService::class)->pushDashboardNotification($audience, compact('type', 'title', 'body', 'link') + ['at' => now()->toIso8601String()]);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
