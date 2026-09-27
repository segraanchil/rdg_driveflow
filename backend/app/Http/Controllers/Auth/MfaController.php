<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\LoginOtpMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

/**
 * Step 2 of login for every role. Required by EnsureMfaVerified before any
 * account-gated route is reachable. No enrollment step — a fresh code is
 * generated and emailed by LoginController on every login.
 */
class MfaController extends Controller
{
    public function verify(Request $request)
    {
        $request->validate(['code' => ['required', 'string', 'size:6']]);

        $user = $request->user();

        if (! $user->verifyMfaCode($request->input('code'))) {
            return response()->json(['message' => 'Invalid or expired code.'], 422);
        }

        $request->session()->put('mfa_verified', true);

        return response()->json(['message' => 'MFA verified.']);
    }

    /** Re-sends a fresh code, e.g. if the first one expired or never arrived. */
    public function resend(Request $request)
    {
        $user = $request->user();

        $code = $user->generateMfaCode();
        Mail::to($user->email)->send(new LoginOtpMail($user, $code));

        return response()->json(['message' => 'Code resent.']);
    }
}
