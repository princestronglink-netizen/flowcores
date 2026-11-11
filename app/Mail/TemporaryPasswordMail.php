<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TemporaryPasswordMail extends Mailable
{
    use SerializesModels;

    public function __construct(
        public User $user,
        public string $tempPassword,
        public bool $isReset = false,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->isReset ? 'Your password has been reset' : 'Your account credentials',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.temporary-password');
    }
}