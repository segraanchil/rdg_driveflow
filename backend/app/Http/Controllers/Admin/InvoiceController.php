<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LegalDocument;
use App\Models\Sale;
use App\Models\Setting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

/**
 * Invoice generation (PDF) for a completed sale: vehicle price, down payment (financing),
 * reservation-fee deduction and the remaining balance (Story 21). Regenerating replaces the
 * previous invoice instead of piling up duplicates.
 */
class InvoiceController extends Controller
{
    public function store(Sale $sale)
    {
        $sale->load(['vehicle', 'buyer', 'reservation']);

        $pdf = Pdf::loadView('pdf.invoice', [
            'sale' => $sale,
            'downPayment' => SaleController::financingDownPayment($sale->buyer_id, $sale->vehicle_id),
            'business' => Setting::allValues(),
        ]);

        $path = "uploads/invoices/sale-{$sale->id}.pdf";
        Storage::disk('public')->put($path, $pdf->output());

        // Invoices share the legal_documents table with the Deed of Sale / Official Receipt.
        $document = LegalDocument::updateOrCreate(
            ['sale_id' => $sale->id, 'doc_type' => LegalDocument::TYPE_INVOICE],
            ['file_path' => $path, 'generated_at' => now()],
        );

        return response()->json($document);
    }
}
