<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TestDrive;
use Illuminate\Http\Request;

/** Admin review queue for buyer-scheduled test drives. Confirm/decline only — never touches vehicle status. */
class TestDriveController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            TestDrive::with(['vehicle', 'buyer'])
                ->orderByRaw("status = 'pending' desc")
                ->orderBy('preferred_at')
                ->paginate(50)
        );
    }

    public function confirm(Request $request, TestDrive $testDrive)
    {
        $data = $request->validate(['admin_notes' => ['nullable', 'string', 'max:500']]);

        $testDrive->update([
            'status' => TestDrive::STATUS_CONFIRMED,
            'admin_notes' => $data['admin_notes'] ?? $testDrive->admin_notes,
        ]);

        return response()->json($testDrive);
    }

    public function decline(Request $request, TestDrive $testDrive)
    {
        $data = $request->validate(['admin_notes' => ['nullable', 'string', 'max:500']]);

        $testDrive->update([
            'status' => TestDrive::STATUS_DECLINED,
            'admin_notes' => $data['admin_notes'] ?? $testDrive->admin_notes,
        ]);

        return response()->json($testDrive);
    }
}
