<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FinancingApplication;
use App\Models\FinancingDocument;
use App\Support\BuyerNotice;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Financing document review. Forwarding the packet to the partner bank happens outside the
 * system (email/physical hand-off); here Admin verifies and downloads documents and records
 * the application's outcome so the buyer can follow it in My Garage.
 */
class FinancingReviewController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            FinancingApplication::with(['buyer:id,name,email', 'vehicle', 'documents'])
                ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
                ->latest()
                ->paginate(50)
        );
    }

    public function update(Request $request, FinancingApplication $application)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(FinancingApplication::STATUSES)],
            'admin_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $changed = $application->status !== $data['status'];
        $application->update($data);

        if ($changed && in_array($data['status'], ['approved', 'rejected'], true)) {
            $v = $application->vehicle;
            BuyerNotice::send($application->buyer, $data['status'] === 'approved' ? 'Your financing was approved' : 'Update on your financing application', [
                $data['status'] === 'approved'
                    ? "Good news! The bank approved your financing for the {$v->year} {$v->make} {$v->model}. Our staff will contact you for the next steps."
                    : "The bank did not approve your financing application for the {$v->year} {$v->make} {$v->model}. You can still buy with Straight Cash or talk to us about other options.",
            ], 'View My Garage', '/garage');
        }

        return response()->json($application->load(['buyer:id,name,email', 'vehicle', 'documents']));
    }

    public function verifyDocument(FinancingDocument $document)
    {
        $document->update(['verified' => true]);

        // Every required document uploaded and verified → move the application to bank review.
        $application = $document->application()->with('documents')->first();
        if ($application && $application->status === 'pending') {
            $verified = $application->documents->where('verified', true)->pluck('doc_type')->unique();
            if (collect($application->required_documents)->diff($verified)->isEmpty()) {
                $application->update(['status' => 'documents_review']);
            }
        }

        return response()->json($document);
    }

    public function downloadDocument(FinancingDocument $document): StreamedResponse
    {
        return Storage::disk('public')->download($document->file_path);
    }
}
