<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcquisitionLead;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Acquisition lead review — shared screen: reachable by both `role:admin`
 * and `role:ceo` (see routes/api.php), not admin-only despite living in
 * this namespace.
 */
class AcquisitionLeadReviewController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(AcquisitionLead::with(['seller', 'vehicle:id,acquisition_lead_id,status'])->latest()->paginate(50));
    }

    /**
     * Adds an accepted car to Inventory ("for inspection") when that didn't happen automatically,
     * e.g. leads accepted before this step existed.
     */
    public function addToInventory(AcquisitionLead $lead)
    {
        if ($lead->status !== AcquisitionLead::STATUS_ACCEPTED) {
            throw ValidationException::withMessages(['lead' => ['Only accepted cars can be added to Inventory.']]);
        }
        $vehicle = \App\Support\LeadToInventory::create($lead);
        if (! $vehicle) {
            throw ValidationException::withMessages(['lead' => ['This car is already in Inventory.']]);
        }

        return response()->json($vehicle, 201);
    }

    /** Which status each status may move to. Accepted and declined leads are closed for good. */
    private const NEXT = [
        AcquisitionLead::STATUS_SUBMITTED => [AcquisitionLead::STATUS_UNDER_APPRAISAL, AcquisitionLead::STATUS_OFFER_MADE, AcquisitionLead::STATUS_DECLINED],
        AcquisitionLead::STATUS_UNDER_APPRAISAL => [AcquisitionLead::STATUS_UNDER_APPRAISAL, AcquisitionLead::STATUS_OFFER_MADE, AcquisitionLead::STATUS_DECLINED],
        AcquisitionLead::STATUS_OFFER_MADE => [AcquisitionLead::STATUS_OFFER_MADE, AcquisitionLead::STATUS_ACCEPTED, AcquisitionLead::STATUS_DECLINED],
    ];

    public function update(Request $request, AcquisitionLead $lead)
    {
        if ($lead->isClosed()) {
            $who = $lead->closed_by === 'seller' ? 'The seller' : 'Staff';
            throw ValidationException::withMessages(['status' => ["{$who} already ".($lead->status === AcquisitionLead::STATUS_ACCEPTED ? 'accepted' : 'declined').' this lead, so it can no longer be changed.']]);
        }

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

        if (! in_array($data['status'], self::NEXT[$lead->status] ?? [], true)) {
            throw ValidationException::withMessages(['status' => [match ($data['status']) {
                AcquisitionLead::STATUS_ACCEPTED => 'Send an offer first. A lead can only be marked accepted after the seller has an offer.',
                default => 'This step isn’t available for the lead’s current status. Refresh the page.',
            }]]);
        }

        $offerSent = $data['status'] === AcquisitionLead::STATUS_OFFER_MADE;
        if (in_array($data['status'], AcquisitionLead::CLOSED, true)) {
            $data['closed_by'] = 'staff';
        }
        $lead->update($data);
        if ($data['status'] === AcquisitionLead::STATUS_ACCEPTED) {
            \App\Support\LeadToInventory::create($lead);
        }

        if ($offerSent) {
            $s = $lead->vehicle_specs ?? [];
            \App\Support\BuyerNotice::send($lead->seller, 'We made an offer for your car', [
                "Our appraiser reviewed your {$s['year']} {$s['make']} {$s['model']} and offers ₱".number_format((float) $lead->offer_amount).'.',
                'Open your submission to accept or decline the offer.',
            ], 'View the offer', "/appraisal-status/{$lead->id}");
        } elseif ($data['status'] === AcquisitionLead::STATUS_DECLINED) {
            $s = $lead->vehicle_specs ?? [];
            \App\Support\BuyerNotice::send($lead->seller, 'Update on your car submission', [
                "Thank you for offering us your {$s['year']} {$s['make']} {$s['model']}. We’re not able to buy it at this time.",
                ...($lead->admin_notes ? ["Note from our appraiser: {$lead->admin_notes}"] : []),
            ], 'View your submission', "/appraisal-status/{$lead->id}");
        }

        return response()->json($lead);
    }
}
