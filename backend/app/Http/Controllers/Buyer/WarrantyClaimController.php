<?php

namespace App\Http\Controllers\Buyer;

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

        // TODO: enforce the 1-month window against $sale->sale_date once business rules are confirmed.

        $evidencePaths = collect($request->file('evidence', []))
            ->map(fn ($file) => $file->store('uploads/warranty_evidence', 'public'))
            ->values()
            ->all();

        $claim = WarrantyClaim::create([
            'sale_id' => $sale->id,
            'issue_description' => $data['issue_description'],
            'evidence_path' => $evidencePaths,
            'status' => WarrantyClaim::STATUS_SUBMITTED,
        ]);

        return response()->json($claim, 201);
    }
}
