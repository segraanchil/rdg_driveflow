<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WarrantyClaim;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Warranty claim review/management (1-month money-back guarantee). Admin/CEO only. */
class WarrantyClaimReviewController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(WarrantyClaim::with('sale.buyer')->latest()->paginate(50));
    }

    public function update(Request $request, WarrantyClaim $claim)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in([
                WarrantyClaim::STATUS_UNDER_REVIEW,
                WarrantyClaim::STATUS_APPROVED,
                WarrantyClaim::STATUS_REJECTED,
                WarrantyClaim::STATUS_REFUNDED,
            ])],
        ]);

        $claim->update($data);

        return response()->json($claim);
    }
}
