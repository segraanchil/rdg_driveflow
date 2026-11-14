<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** One plain status-update email for buyers/sellers (reservation verified, test drive confirmed, ...). */
class BuyerUpdateMail extends Mailable
{
    use Queueable, SerializesModels;

    /** @param  string[]  $lines */
    public function __construct(
        public string $name,
        public string $heading,
        public array $lines,
        public ?string $ctaLabel = null,
        public ?string $ctaUrl = null,
    ) {}

    public function build(): self
    {
        return $this->subject(config('app.name').' — '.$this->heading)->view('emails.buyer-update');
    }
}
