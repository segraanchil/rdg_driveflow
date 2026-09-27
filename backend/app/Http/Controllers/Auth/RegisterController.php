<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\VerifyEmailMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;

/**
 * Self-service signup for buyers and sellers only (browsing itself needs no
 * account — this is only hit when a buyer reserves/applies for financing or
 * a seller submits a vehicle). Admin/CEO accounts are provisioned manually,
 * never through this endpoint.
 */
class RegisterController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in([User::ROLE_BUYER, User::ROLE_SELLER])],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password_hash' => Hash::make($data['password']),
            'role' => $data['role'],
        ]);

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addHour(),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );
        Mail::to($user)->send(new VerifyEmailMail($user, $verificationUrl));

        Auth::login($user);
        $request->session()->regenerate();
        // First session is trusted without a challenge — they just proved
        // control of it by registering. MFA applies starting next login.
        // (Email verification is separate and doesn't gate this session —
        // it's the Story 01/02 acceptance criteria, not an access control.)
        $request->session()->put('mfa_verified', true);

        return response()->json(['user' => $user->only('id', 'name', 'email', 'role')], 201);
    }
}
