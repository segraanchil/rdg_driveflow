<?php

namespace App\Http\Controllers\Buyer;

use App\Support\AdminAlert;
use App\Support\ImageShrinker;
use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\WarrantyClaim;
use Illuminate\Http\Request;

/** 1-month money-back guarantee claim submission. Auth required. */
class WarrantyClaimController extends Controller
{
    public function index(Request $request)
    {
        $saleIds = $request->user()->sales()->pluck('id');

        return response()->json(
            WarrantyClaim::whereIn('sale_id', $saleIds)->with('sale')->latest()->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'sale_id' => ['required', 'exists:sales,id'],
            'issue_description' => ['required', 'string'],
            'evidence.*' => ['file', 'max:10240'],
        ]);

        $sale = Sale::findOrFail($data['sale_id']);
        abort_unless($sale->buyer_id === $request->user()->id, 403);

        // 1-month money-back guarantee: claims are accepted within one month of the sale date.
        if ($sale->sale_date && now()->greaterThan(\Illuminate\Support\Carbon::parse($sale->sale_date)->addMonth()->endOfDay())) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'sale_id' => ['The 1-month warranty period for this purchase has ended.'],
            ]);
        }

        $evidencePaths = collect($request->file('evidence', []))
            ->map(fn ($file) => ImageShrinker::shrinkStored($file->store('uploads/warranty_evidence', 'public')))
            ->values()
            ->all();

        $claim = WarrantyClaim::create([
            'sale_id' => $sale->id,
            'issue_description' => $data['issue_description'],
            'evidence_path' => $evidencePaths,
            'status' => WarrantyClaim::STATUS_SUBMITTED,
        ]);

        // Ticket number, e.g. WC-2026-000042, generated from the claim's own id.
        $claim->update(['ticket_number' => sprintf('WC-%s-%06d', now()->format('Y'), $claim->id)]);
        AdminAlert::notify('warranty', 'New warranty claim ' . $claim->ticket_number, $request->user()->name . ': ' . \Illuminate\Support\Str::limit($data['issue_description'], 90), '/admin/warranty-claims');

        return response()->json($claim, 201);
    }
}
