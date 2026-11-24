<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LegalDocument;
use App\Models\Sale;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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

        return response()->json(self::generate($sale, $data['doc_type']), 201);
    }

    public static function generate(Sale $sale, string $type): LegalDocument
    {
        $pdf = Pdf::loadView("pdf.{$type}", ['sale' => $sale->load(['vehicle', 'buyer', 'intendedOwner'])])
            ->setPaper('legal', 'portrait');

        // The Deed can carry the owner's address and license number, so its link must not be guessable.
        $old = $sale->legalDocuments()->where('doc_type', $type)->value('file_path');
        $path = "uploads/legal_documents/{$type}-sale-{$sale->id}-".Str::lower(Str::random(20)).'.pdf';
        Storage::disk('public')->put($path, $pdf->output());

        $document = LegalDocument::updateOrCreate(
            ['sale_id' => $sale->id, 'doc_type' => $type],
            ['file_path' => $path, 'generated_at' => now()],
        );
        if ($old && $old !== $path) {
            Storage::disk('public')->delete($old);
        }

        return $document;
    }
}
