<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TestDrive;
use App\Support\BuyerNotice;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** Admin review queue for buyer-scheduled test drives. Never touches vehicle status. */
class TestDriveController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            TestDrive::with(['vehicle', 'buyer:id,name,email'])
                ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
                ->orderByRaw("status = 'pending' desc")
                ->orderByRaw("status = 'confirmed' desc")
                ->orderBy('preferred_at')
                ->paginate(50)
        );
    }

    public function confirm(Request $request, TestDrive $testDrive)
    {
        return $this->decide($request, $testDrive, TestDrive::STATUS_CONFIRMED);
    }

    public function decline(Request $request, TestDrive $testDrive)
    {
        return $this->decide($request, $testDrive, TestDrive::STATUS_DECLINED);
    }

    public function complete(Request $request, TestDrive $testDrive)
    {
        if ($testDrive->status !== TestDrive::STATUS_CONFIRMED) {
            throw ValidationException::withMessages(['test_drive' => ['Only a confirmed test drive can be marked as done.']]);
        }
        $testDrive->update(['status' => TestDrive::STATUS_COMPLETED]);

        return response()->json($testDrive->load(['vehicle', 'buyer:id,name,email']));
    }

    private function decide(Request $request, TestDrive $testDrive, string $status)
    {
        $data = $request->validate(['admin_notes' => ['nullable', 'string', 'max:500']]);

        if ($testDrive->status !== TestDrive::STATUS_PENDING) {
            throw ValidationException::withMessages(['test_drive' => ["This request is already {$testDrive->status}."]]);
        }

        $testDrive->update([
            'status' => $status,
            'admin_notes' => $data['admin_notes'] ?? $testDrive->admin_notes,
        ]);

        $v = $testDrive->vehicle;
        $when = $testDrive->preferred_at?->format('l, F j \a\t g:i A');
        BuyerNotice::send($testDrive->buyer, $status === TestDrive::STATUS_CONFIRMED ? 'Your test drive is confirmed' : 'Your test drive request', array_filter([
            $status === TestDrive::STATUS_CONFIRMED
                ? "See you on {$when} for your test drive of the {$v->year} {$v->make} {$v->model}. Please bring a valid driver’s license."
                : "We can’t accommodate your test drive of the {$v->year} {$v->make} {$v->model} on {$when}.",
            ! empty($data['admin_notes']) ? 'Note from our staff: '.$data['admin_notes'] : null,
            $status === TestDrive::STATUS_CONFIRMED ? 'A test drive does not reserve the car. Reserve it online if you don’t want to miss it.' : 'You can request another time from the car’s page.',
        ]), 'View My Garage', '/garage');

        return response()->json($testDrive->load(['vehicle', 'buyer:id,name,email']));
    }
}
