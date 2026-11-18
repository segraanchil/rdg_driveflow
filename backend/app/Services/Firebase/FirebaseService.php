<?php

namespace App\Services\Firebase;

use App\Models\SupportConversation;
use App\Models\SupportMessage;

/**
 * Firebase Realtime Database: the chat's live channel. MySQL stays the permanent record
 * (transcripts, reports); Firebase stores the chat messages as they happen and streams them
 * to open browsers, so new messages appear instantly instead of waiting for the next refresh.
 *
 * Paths written (the server writes with its service account; browsers only read, see
 * firebase/database.rules.json):
 *   chats/{sessionId}/messages                  assistant chat (chat widget, rule-based replies)
 *   support/{guestToken}/messages/{messageId}   "Talk to a person" chat, readable only with the
 *                                                chat's secret 48-character token
 *   support_feed/{messageId}                    staff inbox ping: conversation id + sender only
 *   alerts/{role}                               staff bell ping: type + time only (no names/text)
 *
 * Every method does nothing until FIREBASE_PROJECT_ID / FIREBASE_CREDENTIALS /
 * FIREBASE_DATABASE_URL are set, and a Firebase error never breaks the chat or the request:
 * the browsers then fall back to checking the API every few seconds.
 */
class FirebaseService
{
    public function isConfigured(): bool
    {
        return filled(config('firebase.projects.app.project_id'))
            && filled(config('firebase.projects.app.credentials'))
            && filled(config('firebase.projects.app.database.url'));
    }

    /** @param  array{sender: string, text: string}  $message */
    public function pushChatMessage(string $sessionId, array $message): void
    {
        $this->write(fn ($db) => $db->getReference("chats/{$this->key($sessionId)}/messages")
            ->push($message + ['at' => now()->getTimestampMs()]));
    }

    /** Mirrors one support chat message and pings the staff inbox. */
    public function pushSupportMessage(SupportConversation $conversation, SupportMessage $message): void
    {
        $this->write(function ($db) use ($conversation, $message) {
            $at = $message->created_at?->getTimestampMs() ?? now()->getTimestampMs();
            if (! $message->from_assistant) { // assistant lines are staff-only (see SupportChatController)
                $db->getReference("support/{$conversation->guest_token}/messages/{$message->id}")->set([
                    'id' => $message->id,
                    'sender' => $message->sender,
                    'body' => $message->body,
                    'at' => $at,
                ]);
            }
            $db->getReference("support_feed/{$message->id}")->set([
                'conversation_id' => $conversation->id,
                'sender' => $message->sender,
                'at' => $at,
            ]);
        });
    }

    /** Pings the admin/CEO notification bells; the bell then loads the alert from the API. */
    public function pushDashboardNotification(string $role, array $notification): void
    {
        $this->write(fn ($db) => $db->getReference("alerts/{$this->key($role)}")
            ->push(['type' => $notification['type'] ?? 'general', 'at' => now()->getTimestampMs()]));
    }

    private function write(callable $fn): void
    {
        if (! $this->isConfigured()) {
            return;
        }
        try {
            $fn(app('firebase.database'));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /** Firebase keys can't contain . # $ [ ] / */
    private function key(string $value): string
    {
        return preg_replace('/[.#$\[\]\/]/', '_', $value);
    }
}
