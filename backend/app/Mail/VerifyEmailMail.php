<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** Sent once, right after registration (separate from the per-login MFA code). */
class VerifyEmailMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user, public string $verificationUrl) {}

    public function build(): self
    {
        return $this->subject(config('app.name').' — Verify your email')
            ->view('emails.verify-email')
            ->with(['url' => $this->verificationUrl, 'hours' => 1]);
    }
}
