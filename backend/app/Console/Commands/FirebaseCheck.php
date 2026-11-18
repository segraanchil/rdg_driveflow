<?php

namespace App\Console\Commands;

use App\Services\Firebase\FirebaseService;
use Illuminate\Console\Command;

/**
 * Checks the Firebase setup end to end: backend settings, the service-account key file, a real
 * write + read on the Realtime Database, and whether the frontend's VITE_FIREBASE_* values are filled.
 *
 *   php artisan rdg:firebase-check
 */
class FirebaseCheck extends Command
{
    protected $signature = 'rdg:firebase-check';

    protected $description = 'Test the Firebase Realtime Database connection (backend + frontend settings)';

    public function handle(FirebaseService $firebase): int
    {
        $ok = true;
        $project = config('firebase.projects.app.project_id');
        $credentials = config('firebase.projects.app.credentials');
        $url = config('firebase.projects.app.database.url');

        $this->line('<options=bold>Backend (backend/.env)</>');
        $ok &= $this->check('FIREBASE_PROJECT_ID', filled($project), $project ?: 'empty');
        $ok &= $this->check('FIREBASE_DATABASE_URL', filled($url) && str_starts_with((string) $url, 'https://'), $url ?: 'empty');
        if (filled($credentials) && ! str_starts_with(trim($credentials), '{')) {
            $path = preg_match('/^([A-Za-z]:\\\\|\/)/', $credentials) ? $credentials : base_path($credentials);
            $exists = is_file($path);
            $ok &= $this->check('FIREBASE_CREDENTIALS', $exists, $exists ? $credentials : "file not found: {$path}");
            if ($exists) {
                $json = json_decode((string) file_get_contents($path), true);
                $isKey = is_array($json) && ($json['type'] ?? null) === 'service_account';
                $ok &= $this->check('  key file is a service account', $isKey, $isKey ? ($json['client_email'] ?? '') : 'not a service-account JSON');
                if ($isKey && filled($project) && ($json['project_id'] ?? null) !== $project) {
                    $ok &= $this->check('  key belongs to this project', false, "key is for {$json['project_id']}, .env says {$project}");
                }
            }
        } else {
            $ok &= $this->check('FIREBASE_CREDENTIALS', filled($credentials), filled($credentials) ? 'inline JSON' : 'empty');
        }

        $this->newLine();
        $this->line('<options=bold>Frontend (frontend/.env)</>');
        $env = $this->readFrontendEnv();
        foreach (['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_DATABASE_URL', 'VITE_FIREBASE_APP_ID'] as $key) {
            $ok &= $this->check($key, filled($env[$key] ?? null), filled($env[$key] ?? null) ? 'set' : 'empty');
        }
        if (filled($env['VITE_FIREBASE_DATABASE_URL'] ?? null) && filled($url) && rtrim($env['VITE_FIREBASE_DATABASE_URL'], '/') !== rtrim($url, '/')) {
            $ok &= $this->check('  same database URL as the backend', false, 'frontend and backend URLs differ');
        }

        $this->newLine();
        $this->line('<options=bold>Live test</>');
        if (! $firebase->isConfigured()) {
            $this->check('write + read on the Realtime Database', false, 'skipped: fill in the backend values first');

            return self::FAILURE;
        }
        try {
            $db = app('firebase.database');
            $stamp = now()->getTimestampMs();
            $db->getReference('diagnostics/last_check')->set(['at' => $stamp, 'from' => 'rdg:firebase-check']);
            $back = $db->getReference('diagnostics/last_check/at')->getValue();
            $ok &= $this->check('write + read on the Realtime Database', $back === $stamp, $back === $stamp ? 'connected' : 'read back a different value');
        } catch (\Throwable $e) {
            $this->check('write + read on the Realtime Database', false, $this->explain($e));
            $ok = false;
        }

        $this->newLine();
        if ($ok) {
            $this->info('Firebase is connected. Restart "npm run dev" if you just changed frontend/.env.');

            return self::SUCCESS;
        }
        $this->warn('Not connected yet. Fix the items marked FAIL (see docs/FIREBASE_SETUP.md).');

        return self::FAILURE;
    }

    private function check(string $label, bool $pass, string $detail): bool
    {
        $this->line(sprintf('  %s  %-36s %s', $pass ? '<fg=green>OK  </>' : '<fg=red>FAIL</>', $label, $detail));

        return $pass;
    }

    /** @return array<string, string> */
    private function readFrontendEnv(): array
    {
        $file = base_path('../frontend/.env');
        $out = [];
        if (is_file($file)) {
            foreach (file($file, FILE_IGNORE_NEW_LINES) as $line) {
                if (preg_match('/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/', $line, $m)) {
                    $out[$m[1]] = trim($m[2], " \"'");
                }
            }
        }

        return $out;
    }

    private function explain(\Throwable $e): string
    {
        $msg = $e->getMessage();
        if (str_contains($msg, '404') || str_contains($msg, 'not found')) {
            return 'database not found: check FIREBASE_DATABASE_URL (Realtime Database page, top of the Data tab)';
        }
        if (str_contains($msg, 'invalid_grant') || str_contains($msg, 'Invalid JWT')) {
            return 'the key was rejected: generate a new private key, and check the PC clock';
        }
        if (str_contains($msg, 'Permission denied') || str_contains($msg, '401') || str_contains($msg, '403')) {
            return 'permission denied: the key must belong to this project';
        }
        if (str_contains($msg, 'cURL error') || str_contains($msg, 'Could not resolve')) {
            return 'no connection to Firebase: check the internet connection';
        }

        return mb_strimwidth($msg, 0, 140, '...');
    }
}
