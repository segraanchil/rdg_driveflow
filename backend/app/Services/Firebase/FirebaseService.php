<?php

namespace App\Services\Firebase;

/**
 * Thin wrapper around the Firebase Realtime Database, used only for:
 *   - AI chatbot message streams (buyer widget <-> human agent escalation)
 *   - Live dashboard notification pushes (admin/CEO)
 *
 * Core business data (vehicles, reservations, sales, etc.) never goes
 * through here — that's all MySQL/Eloquent. No Firebase project has been
 * created yet, so every method no-ops until config/firebase.php has real
 * credentials (FIREBASE_PROJECT_ID / FIREBASE_CREDENTIALS / FIREBASE_DATABASE_URL).
 */
class FirebaseService
{
    public function isConfigured(): bool
    {
        return filled(config('firebase.projects.app.project_id'))
            && filled(config('firebase.projects.app.credentials'));
    }

    /**
     * Push a chatbot message onto /chats/{sessionId}/messages.
     *
     * @param  array{sender: string, text: string, escalated?: bool}  $message
     */
    public function pushChatMessage(string $sessionId, array $message): void
    {
        if (! $this->isConfigured()) {
            return;
        }

        // TODO: once a Firebase project exists, write via kreait/firebase-php:
        // app('firebase.database')->getReference("chats/{$sessionId}/messages")->push($message);
    }

    /**
     * Push a notification onto /notifications/{role} for the live admin/CEO dashboard.
     */
    public function pushDashboardNotification(string $role, array $notification): void
    {
        if (! $this->isConfigured()) {
            return;
        }

        // TODO: app('firebase.database')->getReference("notifications/{$role}")->push($notification);
    }
}
