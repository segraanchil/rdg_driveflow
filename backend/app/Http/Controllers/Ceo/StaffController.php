<?php

namespace App\Http\Controllers\Ceo;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * Story 28 — CEO manages Administrative Staff accounts (add / edit /
 * deactivate). Scoped to role=admin only: buyer/seller accounts are
 * self-service, and CEO accounts aren't managed through this screen.
 */
class StaffController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            User::where('role', User::ROLE_ADMIN)->orderBy('name')->get(['id', 'name', 'email', 'is_active', 'created_at'])
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $admin = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password_hash' => Hash::make($data['password']),
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        return response()->json($admin, 201);
    }

    public function update(Request $request, User $staff)
    {
        abort_unless($staff->role === User::ROLE_ADMIN, 404);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($staff->id)],
        ]);

        $staff->update($data);

        return response()->json($staff);
    }

    public function deactivate(User $staff)
    {
        abort_unless($staff->role === User::ROLE_ADMIN, 404);

        $staff->update(['is_active' => false]);

        return response()->json($staff);
    }

    public function activate(User $staff)
    {
        abort_unless($staff->role === User::ROLE_ADMIN, 404);

        $staff->update(['is_active' => true]);

        return response()->json($staff);
    }
}
