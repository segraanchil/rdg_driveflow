<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\BuyerUpdateMail;
use App\Models\User;
use App\Support\PasswordRules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

/**
 * "Forgot password": email a one-hour reset link, then set a new password with it.
 * Tokens are stored hashed by Laravel's password broker (password_reset_tokens table).
 * The request step always answers the same way, so it can't be used to find out
 * which emails have accounts.
 */
class PasswordResetController extends Controller
{
    public function sendLink(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $user = User::where('email', $data['email'])->where('is_active', true)->whereNull('deleted_at')->first();
        $broker = Password::broker();

        if ($user && ! $broker->getRepository()->recentlyCreatedToken($user)) {
            $token = $broker->createToken($user);
            $url = rtrim(config('app.frontend_url'), '/').'/reset-password?'.http_build_query(['token' => $token, 'email' => $user->email]);

            try {
                Mail::to($user->email)->send(new BuyerUpdateMail($user->name, 'Reset your password', [
                    'We received a request to reset the password for your RDG DriveFlow account.',
                    'The link works for 60 minutes. If you didn’t ask for this, ignore this email and your password stays the same.',
                ], 'Choose a new password', $url));
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return response()->json(['message' => 'If an account uses that email, we sent a link to reset the password. Check your inbox and spam folder.']);
    }

    public function reset(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => PasswordRules::rules(),
        ], PasswordRules::messages());

        $user = User::where('email', $data['email'])->whereNull('deleted_at')->first();
        $repo = Password::broker()->getRepository();

        if (! $user || ! $repo->exists($user, $data['token'])) {
            throw ValidationException::withMessages(['token' => ['This reset link is invalid or has expired. Ask for a new one.']]);
        }

        $user->forceFill(['password_hash' => Hash::make($data['password'])])->save();
        $repo->delete($user);

        return response()->json(['message' => 'Your password was changed. Log in with your new password.']);
    }
}
