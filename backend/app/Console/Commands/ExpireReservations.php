<?php

namespace App\Console\Commands;

use App\Models\Reservation;
use Illuminate\Console\Command;

/**
 * `php artisan reservations:expire` — the scheduled-job version of the
 * lazy expiry check already run inline wherever reservations are read.
 * A real deployment would cron this (e.g. hourly); this local setup has
 * no cron/queue worker, so the lazy check is what actually keeps things
 * correct day-to-day.
 */
class ExpireReservations extends Command
{
    protected $signature = 'reservations:expire';

    protected $description = 'Revert vehicles from unverified reservations past their 48-hour window back to available';

    public function handle(): int
    {
        $count = Reservation::expireOverdue();

        $this->info("Expired {$count} overdue reservation(s).");

        return self::SUCCESS;
    }
}
