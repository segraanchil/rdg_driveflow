<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route middleware: mfa
 *
 * Admin/CEO accounts authenticate in two steps: password login (see
 * AuthController) puts the user in a "pending MFA" state, then
 * MfaController::verify sets session('mfa_verified', true) once the TOTP
 * code checks out. This middleware blocks admin/ceo routes until that flag
 * is set. Buyer/seller routes never attach this middleware.
 */
class EnsureMfaVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->requiresMfa() && ! $request->session()->get('mfa_verified')) {
            abort(403, 'MFA verification required.');
        }

        return $next($request);
    }
}
