<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\AcquisitionLead;
use App\Support\AdminAlert;
use App\Support\ImageShrinker;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** "Sell Your Car": submit a car for appraisal, track it, and accept or decline the offer. */
class AcquisitionLeadController extends Controller
{
    public function index(Request $request)
    {
        return response()->json($request->user()->acquisitionLeads()->latest()->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'make' => ['required', 'string', 'max:60'],
            'model' => ['required', 'string', 'max:60'],
            'year' => ['required', 'integer', 'min:1980', 'max:'.(now()->year + 1)],
            'mileage' => ['required', 'integer', 'min:0', 'max:2000000'],
            'transmission' => ['nullable', Rule::in(['Automatic', 'Manual', 'CVT'])],
            'fuel_type' => ['nullable', Rule::in(['Gasoline', 'Diesel', 'Hybrid', 'Electric'])],
            'color' => ['nullable', 'string', 'max:40'],
            'condition' => ['nullable', Rule::in(['Excellent', 'Good', 'Fair', 'Needs repair'])],
            'asking_price' => ['nullable', 'numeric', 'min:0', 'max:100000000'],
            'complete_papers' => ['nullable', 'boolean'],
            'location' => ['nullable', 'string', 'max:120'],
            'contact_number' => ['required', 'string', 'max:30'],
            'condition_notes' => ['nullable', 'string', 'max:3000'],
            'photos' => ['required', 'array', 'min:3', 'max:15'],
            'photos.*' => ['file', 'image', 'max:10240'],
        ], [
            'photos.required' => 'Add at least 3 photos so we can appraise your car.',
            'photos.min' => 'Add at least 3 photos so we can appraise your car.',
            'contact_number.required' => 'Add a mobile number so our appraiser can reach you.',
        ]);

        $photoPaths = collect($request->file('photos', []))
            ->map(fn ($file) => ImageShrinker::shrinkStored($file->store('uploads/acquisition_photos', 'public')))
            ->values()
            ->all();

        $specs = collect($data)->except('photos')->filter(fn ($v) => $v !== null && $v !== '')->all();
        $specs['complete_papers'] = $request->boolean('complete_papers');

        $lead = AcquisitionLead::create([
            'seller_id' => $request->user()->id,
            'vehicle_specs' => $specs,
            'photos_path' => $photoPaths,
            'status' => AcquisitionLead::STATUS_SUBMITTED,
        ]);

        AdminAlert::notify('lead', 'New car submitted for appraisal', "{$request->user()->name} submitted a {$data['year']} {$data['make']} {$data['model']}.", '/admin/acquisition-leads', 'both');

        return response()->json($lead, 201);
    }

    /** Appraisal status tracker for a single submission. */
    public function show(AcquisitionLead $lead)
    {
        abort_unless($lead->seller_id === request()->user()->id, 403);

        return response()->json($lead);
    }

    /** The seller's answer to the dealership's offer. */
    public function respond(Request $request, AcquisitionLead $lead)
    {
        abort_unless($lead->seller_id === $request->user()->id, 403);
        $data = $request->validate(['decision' => ['required', Rule::in(['accept', 'decline'])]]);

        if ($lead->status !== AcquisitionLead::STATUS_OFFER_MADE) {
            throw ValidationException::withMessages(['decision' => ['There is no open offer to answer for this car.']]);
        }

        $accepted = $data['decision'] === 'accept';
        $lead->update(['status' => $accepted ? AcquisitionLead::STATUS_ACCEPTED : AcquisitionLead::STATUS_DECLINED]);

        $s = $lead->vehicle_specs ?? [];
        AdminAlert::notify(
            'lead',
            $accepted ? 'Seller accepted your offer' : 'Seller declined your offer',
            "{$request->user()->name} ".($accepted ? 'accepted' : 'declined')." the ₱".number_format((float) $lead->offer_amount)." offer for the {$s['year']} {$s['make']} {$s['model']}.".($accepted ? ' Schedule the inspection and hand-over.' : ''),
            '/admin/acquisition-leads',
            'both',
        );

        return response()->json($lead);
    }
}
