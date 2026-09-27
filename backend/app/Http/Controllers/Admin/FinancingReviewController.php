<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FinancingApplication;
use App\Models\FinancingDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Financing document review. Admin/CEO only.
 *
 * Forwarding the packet to the partner bank happens outside this system
 * entirely (email/physical handoff, per the docu's "Download Financing
 * Documents" use case) — Admin's role here stops at verifying and
 * downloading, not logging a submission.
 */
class FinancingReviewController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            FinancingApplication::with(['buyer', 'vehicle', 'documents'])->latest()->paginate(50)
        );
    }

    public function verifyDocument(FinancingDocument $document)
    {
        $document->update(['verified' => true]);

        return response()->json($document);
    }

    public function downloadDocument(FinancingDocument $document): StreamedResponse
    {
        return Storage::disk('public')->download($document->file_path);
    }
}
