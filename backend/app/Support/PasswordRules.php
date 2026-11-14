<?php

namespace App\Support;

use Illuminate\Validation\Rules\Password;

/**
 * One password policy for sign-up, reset and change password:
 * at least 8 characters with an uppercase letter, a lowercase letter and a number.
 * The sign-up page shows the same checklist live (frontend/src/components/ui/PasswordRules.jsx).
 */
class PasswordRules
{
    public static function rules(): array
    {
        return ['required', 'string', 'max:72', 'confirmed', Password::min(8)->mixedCase()->numbers()];
    }

    public static function messages(): array
    {
        return [
            'password.confirmed' => 'The two passwords don’t match.',
        ];
    }
}
