<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

/** In-app notification for buyers and sellers (the bell in the public navbar). Stored in MySQL only. */
class UserNotice extends Notification
{
    public function __construct(
        public string $kind,
        public string $title,
        public ?string $body = null,
        public ?string $link = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return ['type' => $this->kind, 'title' => $this->title, 'body' => $this->body, 'link' => $this->link];
    }
}
