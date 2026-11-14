<?php

namespace App\Support;

use App\Mail\BuyerUpdateMail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

/**
 * Emails a buyer/seller when staff act on something of theirs. Like AdminAlert, a mail
 * failure never blocks the staff action (MAIL_MAILER=log writes it to laravel.log locally).
 */
class BuyerNotice
{
    /** @param  string[]  $lines  $path is a frontend path such as /garage */
    public static function send(?User $user, string $heading, array $lines, ?string $ctaLabel = null, ?string $path = null): void
    {
        if (! $user?->email) {
            return;
        }

        try {
            $url = $path ? rtrim(config('app.frontend_url'), '/').$path : null;
            Mail::to($user->email)->send(new BuyerUpdateMail($user->name, $heading, $lines, $ctaLabel, $url));
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
