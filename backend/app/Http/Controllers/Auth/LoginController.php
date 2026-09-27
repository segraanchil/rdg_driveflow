<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\LoginOtpMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * Step 1 (password) login for all four roles. Every account then needs
 * MfaController::verify before the session is fully trusted — see
 * EnsureMfaVerified middleware.
 */
class LoginController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password_hash)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['This account has been deactivated. Contact the CEO for access.'],
            ]);
        }

        Auth::login($user);
        $request->session()->regenerate();
        $request->session()->put('mfa_verified', false);

        $code = $user->generateMfaCode();
        Mail::to($user->email)->send(new LoginOtpMail($user, $code));

        return response()->json([
            'user' => $user->only('id', 'name', 'email', 'role'),
            'mfa_required' => true,
        ]);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out.']);
    }

    /** Also reports mfa_verified so the frontend can recover MFA state after a page refresh. */
    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user(),
            'mfa_verified' => (bool) $request->session()->get('mfa_verified'),
        ]);
    }
}
