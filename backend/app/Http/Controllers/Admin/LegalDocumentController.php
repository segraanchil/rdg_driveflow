<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LegalDocument;
use App\Models\Sale;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/** Deed of Sale / Official Receipt PDF generation. Regenerating replaces the previous file. */
class LegalDocumentController extends Controller
{
    public function store(Request $request, Sale $sale)
    {
        $data = $request->validate([
            'doc_type' => ['required', Rule::in([
                LegalDocument::TYPE_DEED_OF_SALE,
                LegalDocument::TYPE_OFFICIAL_RECEIPT,
            ])],
        ]);

        $pdf = Pdf::loadView("pdf.{$data['doc_type']}", ['sale' => $sale->load(['vehicle', 'buyer'])])
            ->setPaper('legal', 'portrait');

        $path = "uploads/legal_documents/{$data['doc_type']}-sale-{$sale->id}.pdf";
        Storage::disk('public')->put($path, $pdf->output());

        $document = LegalDocument::updateOrCreate(
            ['sale_id' => $sale->id, 'doc_type' => $data['doc_type']],
            ['file_path' => $path, 'generated_at' => now()],
        );

        return response()->json($document, 201);
    }
}
