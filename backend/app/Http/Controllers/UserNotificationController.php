<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

/** The bell on the public site for buyers and sellers (Laravel database notifications). */
class UserNotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'unread' => $user->unreadNotifications()->count(),
            'items' => $user->notifications()->latest()->take(30)->get()->map(fn ($n) => [
                'id' => $n->id,
                'type' => $n->data['type'] ?? 'general',
                'title' => $n->data['title'] ?? '',
                'body' => $n->data['body'] ?? null,
                'link' => $n->data['link'] ?? null,
                'read_at' => $n->read_at,
                'created_at' => $n->created_at,
            ]),
        ]);
    }

    public function read(Request $request, string $id)
    {
        $request->user()->notifications()->whereKey($id)->first()?->markAsRead();

        return response()->json(['ok' => true]);
    }

    public function readAll(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['ok' => true]);
    }
}
