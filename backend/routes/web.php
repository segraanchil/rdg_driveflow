<?php

use Illuminate\Support\Facades\Route;

// The React PWA is served separately by Vite/the frontend build. This route
// only exists so visiting the API host root doesn't 404 during development.
Route::get('/', function () {
    return response()->json([
        'app' => 'RDG DriveFlow API',
        'status' => 'ok',
    ]);
});
