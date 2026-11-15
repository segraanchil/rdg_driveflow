<?php

namespace App\Support;

use App\Mail\BuyerUpdateMail;
use App\Models\User;
use App\Notifications\UserNotice;
use Illuminate\Support\Facades\Mail;

/**
 * Tells a buyer/seller when staff act on something of theirs: an email plus an in-app
 * notification (the bell on the public site). Like AdminAlert, a failure never blocks the
 * staff action (MAIL_MAILER=log writes the email to laravel.log locally).
 */
class BuyerNotice
{
    /** @param  string[]  $lines  $path is a frontend path such as /garage */
    public static function send(?User $user, string $heading, array $lines, ?string $ctaLabel = null, ?string $path = null, bool $email = true): void
    {
        if (! $user?->email || $user->deleted_at) {
            return;
        }

        try {
            $user->notify(new UserNotice(self::kind($path), $heading, \Illuminate\Support\Str::limit($lines[0] ?? '', 160), $path));
        } catch (\Throwable $e) {
            report($e);
        }

        if (! $email) {
            return;
        }
        try {
            $url = $path ? rtrim(config('app.frontend_url'), '/').$path : null;
            Mail::to($user->email)->send(new BuyerUpdateMail($user->name, $heading, $lines, $ctaLabel, $url));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /** Icon group for the bell, from where the notification leads. */
    private static function kind(?string $path): string
    {
        return match (true) {
            $path === null => 'general',
            str_starts_with($path, '/appraisal-status'), str_starts_with($path, '/my-leads') => 'lead',
            str_contains($path, 'test-drive') => 'test_drive',
            str_contains($path, 'financing') => 'financing',
            str_contains($path, 'warranty') => 'warranty',
            str_contains($path, 'chat') => 'chat',
            default => 'reservation',
        };
    }
}
