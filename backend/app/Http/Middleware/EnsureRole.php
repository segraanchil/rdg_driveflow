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
            abort(403, 'You do not have access to this resource.');
        }

        return $next($request);
    }
}
