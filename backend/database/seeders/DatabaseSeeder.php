<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Seed accounts for local testing only — change these before any real deployment.
        User::firstOrCreate(
            ['email' => 'ceo@rdgcardeals.test'],
            ['name' => 'RDG CEO', 'password_hash' => Hash::make('password'), 'role' => User::ROLE_CEO]
        );

        User::firstOrCreate(
            ['email' => 'admin@rdgcardeals.test'],
            ['name' => 'RDG Admin', 'password_hash' => Hash::make('password'), 'role' => User::ROLE_ADMIN]
        );
    }
}
