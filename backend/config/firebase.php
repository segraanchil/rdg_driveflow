<?php

// Firebase is used ONLY for the AI chatbot message stream and live dashboard
// notifications (see App\Services\Firebase\FirebaseService). Core business
// data (vehicles, reservations, sales, etc.) always lives in MySQL.
//
// No project is configured yet — ask before creating one. Until
// FIREBASE_CREDENTIALS is set, FirebaseService no-ops instead of throwing,
// so the rest of the app runs fine without it.

return [

    'default' => 'app',

    'projects' => [

        'app' => [
            'project_id' => env('FIREBASE_PROJECT_ID'),

            // Path to a service account JSON key, or JSON contents directly.
            'credentials' => env('FIREBASE_CREDENTIALS'),

            'database' => [
                'url' => env('FIREBASE_DATABASE_URL'),
            ],
        ],

    ],

];
