<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcquisitionLead;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Acquisition lead review — shared screen: reachable by both `role:admin`
 * and `role:ceo` (see routes/api.php), not admin-only despite living in
 * this namespace.
 */
class AcquisitionLeadReviewController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(AcquisitionLead::with('seller')->latest()->paginate(50));
    }

    public function update(Request $request, AcquisitionLead $lead)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in([
                AcquisitionLead::STATUS_UNDER_APPRAISAL,
                AcquisitionLead::STATUS_OFFER_MADE,
                AcquisitionLead::STATUS_ACCEPTED,
                AcquisitionLead::STATUS_DECLINED,
            ])],
        ]);

        $lead->update($data);

        return response()->json($lead);
    }
}
