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
            'offer_amount' => ['nullable', 'numeric', 'min:0', 'required_if:status,' . AcquisitionLead::STATUS_OFFER_MADE],
            'admin_notes' => ['nullable', 'string', 'max:2000'],
        ], [
            'offer_amount.required_if' => 'Enter the offer amount before marking an offer as made.',
        ]);

        $offerSent = $data['status'] === AcquisitionLead::STATUS_OFFER_MADE;
        $lead->update($data);

        if ($offerSent) {
            $s = $lead->vehicle_specs ?? [];
            \App\Support\BuyerNotice::send($lead->seller, 'We made an offer for your car', [
                "Our appraiser reviewed your {$s['year']} {$s['make']} {$s['model']} and offers ₱".number_format((float) $lead->offer_amount).'.',
                'Open your submission to accept or decline the offer.',
            ], 'View the offer', "/appraisal-status/{$lead->id}");
        }

        return response()->json($lead);
    }
}
