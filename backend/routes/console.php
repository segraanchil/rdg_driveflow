<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Release reservations whose 48-hour hold has passed (needs `php artisan schedule:work` locally,
// or a cron job running `php artisan schedule:run` every minute on a server).
\Illuminate\Support\Facades\Schedule::command('reservations:expire')->everyFiveMinutes();
