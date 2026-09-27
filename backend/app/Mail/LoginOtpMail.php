<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** The second-factor code sent on every login, for all 4 roles. */
class LoginOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user, public string $code) {}

    public function build(): self
    {
        return $this->subject(config('app.name').' — Your login code')
            ->view('emails.login-otp')
            ->with(['code' => $this->code, 'minutes' => 5]);
    }
}
