<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route middleware: role:admin or role:admin,ceo
 *
 * Gates admin-only / CEO-only / shared admin+CEO routes. Buyer and seller
 * routes never use this — browsing and submission stay open, and buyer/
 * seller-scoped writes are authorized against the authenticated user id
 * directly in each controller.
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, $roles, true)) {
            $needed = implode(' or ', array_map('ucfirst', $roles));
            abort(403, $user
                ? "This needs a {$needed} account. You're signed in as ".ucfirst($user->role).' ('.$user->email.'). Log out and sign in with a '.$needed.' account.'
                : 'Please log in first.');
        }

        return $next($request);
    }
}
