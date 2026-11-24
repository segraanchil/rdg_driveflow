<?php

namespace App\Http\Controllers;

use App\Mail\BuyerUpdateMail;
use App\Mail\VerifyEmailMail;
use App\Models\IntendedOwner;
use App\Models\Reservation;
use App\Models\Sale;
use App\Models\User;
use App\Support\PasswordRules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * "My account" for the signed-in user.
 *  - Every role: change password.
 *  - Buyers and sellers also: edit name and mobile number, change email, delete the account.
 *    Admin and CEO accounts are managed by the CEO (Manage Admins), so those three stay off for staff.
 */
class AccountController extends Controller
{
    public function updateProfile(Request $request)
    {
        $this->customerOnly($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+\-\s()]{7,30}$/'],
        ], ['phone.regex' => 'Enter a valid mobile number, e.g. 0917 123 4567.']);

        $request->user()->update($data);

        return response()->json(['user' => $request->user()->fresh(), 'message' => 'Profile saved.']);
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password' => [...PasswordRules::rules(), 'different:current_password'],
        ], PasswordRules::messages() + ['password.different' => 'Choose a password different from your current one.']);

        $user = $request->user();
        $this->checkPassword($user, $request->input('current_password'));
        $user->forceFill(['password_hash' => Hash::make($request->input('password'))])->save();

        try {
            Mail::to($user->email)->send(new BuyerUpdateMail($user->name, 'Your password was changed', [
                'The password for your RDG DriveFlow account was just changed.',
                'If this wasn’t you, use “Forgot password” on the login page right away and tell our staff.',
            ]));
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(['message' => 'Password changed.']);
    }

    public function updateEmail(Request $request)
    {
        $this->customerOnly($request);
        $user = $request->user();
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'current_password' => ['required', 'string'],
        ], ['email.unique' => 'Another account already uses this email.']);
        $this->checkPassword($user, $data['current_password']);

        if (strcasecmp($data['email'], $user->email) === 0) {
            throw ValidationException::withMessages(['email' => ['That is already your email.']]);
        }

        $old = $user->email;
        $user->forceFill(['email' => $data['email'], 'email_verified_at' => null])->save();

        try {
            $link = URL::temporarySignedRoute('verification.verify', now()->addHour(), ['id' => $user->id, 'hash' => sha1($user->email)]);
            Mail::to($user->email)->send(new VerifyEmailMail($user, $link));
            Mail::to($old)->send(new BuyerUpdateMail($user->name, 'Your email was changed', [
                "Your RDG DriveFlow account now uses {$user->email}. Login codes and updates go there from now on.",
                'If this wasn’t you, contact our staff right away.',
            ]));
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(['user' => $user->fresh(), 'message' => 'Email changed. We sent a confirmation link to your new address.']);
    }

    /**
     * Deletes a buyer/seller account. The row is anonymised (name, email, phone, password) instead of
     * removed so completed sales, invoices and warranty records stay intact for the business.
     */
    public function destroy(Request $request)
    {
        $this->customerOnly($request);
        $user = $request->user();
        $request->validate([
            'current_password' => ['required', 'string'],
            'confirm' => ['required', 'in:DELETE'],
        ], ['confirm.in' => 'Type DELETE in capital letters to confirm.', 'confirm.required' => 'Type DELETE in capital letters to confirm.']);
        $this->checkPassword($user, $request->input('current_password'));

        $holding = $user->reservations()->whereIn('status', [Reservation::STATUS_PENDING, Reservation::STATUS_VERIFIED])->exists();
        if ($holding) {
            throw ValidationException::withMessages(['confirm' => ['You still have an active reservation. Ask our staff to cancel or finish it before deleting your account.']]);
        }

        $user->savedVehicles()->detach();
        // Other people's license photos go too, unless a recorded sale's Deed names them.
        IntendedOwner::where('buyer_id', $user->id)->whereNotIn('id', Sale::whereNotNull('intended_owner_id')->select('intended_owner_id'))->get()->each->delete();
        $user->forceFill([
            'name' => 'Deleted user',
            'email' => "deleted-{$user->id}-".Str::lower(Str::random(6)).'@deleted.invalid',
            'phone' => null,
            'password_hash' => Hash::make(Str::random(40)),
            'mfa_secret' => null,
            'mfa_code_expires_at' => null,
            'remember_token' => null,
            'is_active' => false,
            'deleted_at' => now(),
        ])->save();

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Your account was deleted.']);
    }

    private function customerOnly(Request $request): void
    {
        abort_unless(in_array($request->user()->role, [User::ROLE_BUYER, User::ROLE_SELLER], true), 403,
            'Staff accounts are managed by the CEO. You can change your password here.');
    }

    private function checkPassword(User $user, ?string $password): void
    {
        if (! $password || ! Hash::check($password, $user->password_hash)) {
            throw ValidationException::withMessages(['current_password' => ['Your current password is incorrect.']]);
        }
    }
}
