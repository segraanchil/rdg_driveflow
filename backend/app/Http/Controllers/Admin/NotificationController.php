<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use Illuminate\Http\Request;

/** The admin panel's notification bell (Admin and CEO). */
class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $role = $request->user()->role;

        return response()->json([
            'unread' => AdminNotification::for($role)->whereNull('read_at')->count(),
            'items' => AdminNotification::for($role)->latest()->limit(20)->get(),
        ]);
    }

    public function markRead(Request $request, AdminNotification $notification)
    {
        abort_unless(in_array($notification->audience, [$request->user()->role, 'both'], true), 403);
        $notification->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function markAllRead(Request $request)
    {
        AdminNotification::for($request->user()->role)->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }
}
