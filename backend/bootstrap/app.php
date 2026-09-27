<?php

use App\Http\Middleware\EnsureMfaVerified;
use App\Http\Middleware\EnsureRole;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Wires session + cookie middleware into the api group for Sanctum's
        // SPA cookie auth. Manually prepending EnsureFrontendRequestsAreStateful
        // alone isn't enough on Laravel 11's bootstrap-based middleware stack —
        // the controller never gets a session store without this.
        $middleware->statefulApi();

        $middleware->alias([
            'role' => EnsureRole::class,
            'mfa' => EnsureMfaVerified::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
