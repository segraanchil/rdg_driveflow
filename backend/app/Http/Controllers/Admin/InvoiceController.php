<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LegalDocument;
use App\Models\Sale;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/** Invoice generation (PDF) for a completed sale. Admin/CEO only. */
class InvoiceController extends Controller
{
    public function store(Sale $sale)
    {
        $pdf = Pdf::loadView('pdf.invoice', ['sale' => $sale->load(['vehicle', 'buyer'])]);

        $path = "uploads/invoices/sale-{$sale->id}.pdf";
        Storage::disk('public')->put($path, $pdf->output());

        // Invoices share the legal_documents table with the Deed of Sale /
        // Official Receipt — all three are generated-PDF-tied-to-a-sale
        // records, not distinct enough to warrant their own table.
        $document = LegalDocument::create([
            'sale_id' => $sale->id,
            'doc_type' => LegalDocument::TYPE_INVOICE,
            'file_path' => $path,
            'generated_at' => now(),
        ]);

        return response()->json($document);
    }
}
