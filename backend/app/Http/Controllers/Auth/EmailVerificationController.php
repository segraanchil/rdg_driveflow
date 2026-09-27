<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Handles the signed link sent by VerifyEmailMail on registration. Not
 * behind auth:sanctum — the email is often opened in a different browser
 * context than the one that registered, so the signature itself (plus the
 * email hash) is the proof, same shape as Laravel's stock verification.
 */
class EmailVerificationController extends Controller
{
    public function verify(Request $request, string $id, string $hash)
    {
        $user = User::findOrFail($id);
        $frontendUrl = rtrim(config('app.frontend_url'), '/');

        if (! hash_equals(sha1($user->email), $hash)) {
            return redirect($frontendUrl.'/email-verified?status=invalid');
        }

        if (! $user->email_verified_at) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        return redirect($frontendUrl.'/email-verified?status=success');
    }
}
