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
        $rules = [
            'make' => ['required', 'string', 'max:60'],
            'model' => ['required', 'string', 'max:60'],
            'year' => ['required', 'integer', 'min:1980', 'max:'.(now()->year + 1)],
            'mileage' => ['required', 'integer', 'min:0', 'max:2000000'],
            'transmission' => ['required', Rule::in(['Automatic', 'Manual', 'CVT'])],
            'fuel_type' => ['required', Rule::in(['Gasoline', 'Diesel', 'Hybrid', 'Electric'])],
            'color' => ['nullable', 'string', 'max:40'],
            'condition' => ['required', Rule::in(['Excellent', 'Good', 'Fair', 'Needs repair'])],
            'asking_price' => ['required', 'numeric', 'min:10000', 'max:100000000'],
            'complete_papers' => ['nullable', 'boolean'],
            'location' => ['nullable', 'string', 'max:120'],
            'contact_number' => ['required', 'string', 'max:30'],
            'condition_notes' => ['nullable', 'string', 'max:3000'],
            'photos' => ['required', 'array'],
        ];
        $messages = [
            'contact_number.required' => 'Add a mobile number so our appraiser can reach you.',
            'asking_price.required' => 'Enter your asking price.',
            'asking_price.min' => 'The asking price looks too low. Enter the full amount in pesos, e.g. 450,000.',
            'transmission.required' => 'Choose the transmission.',
            'fuel_type.required' => 'Choose the fuel type.',
        ];
        foreach (AcquisitionLead::PHOTO_SLOTS as $key => [$label, $required, $max]) {
            if ($max > 1) {
                $rules["photos.$key"] = ['nullable', 'array', "max:$max"];
                $rules["photos.$key.*"] = ['file', 'image', 'max:10240'];
            } else {
                $rules["photos.$key"] = [$required ? 'required' : 'nullable', 'file', 'image', 'max:10240'];
            }
            $messages["photos.$key.required"] = "Add the {$label} photo.";
            $messages["photos.$key.image"] = "The {$label} photo must be an image (JPG or PNG).";
            $messages["photos.$key.max"] = $max > 1 ? "Up to {$max} photos for {$label}." : "The {$label} photo must be 10 MB or smaller.";
        }
        $messages['photos.required'] = 'Add the required photos so we can appraise your car.';
        $data = $request->validate($rules, $messages);

        // Store in slot order so the first photo is always the front view.
        $photoPaths = [];
        $photoLabels = [];
        foreach (AcquisitionLead::PHOTO_SLOTS as $key => [$label]) {
            $files = $request->file("photos.$key");
            foreach (is_array($files) ? $files : array_filter([$files]) as $file) {
                $photoPaths[] = ImageShrinker::shrinkStored($file->store('uploads/acquisition_photos', 'public'));
                $photoLabels[] = $label;
            }
        }

        $specs = collect($data)->except('photos')->filter(fn ($v) => $v !== null && $v !== '')->all();
        $specs['complete_papers'] = $request->boolean('complete_papers');

        $lead = AcquisitionLead::create([
            'seller_id' => $request->user()->id,
            'vehicle_specs' => $specs,
            'photos_path' => $photoPaths,
            'photo_labels' => $photoLabels,
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
        $lead->update(['status' => $accepted ? AcquisitionLead::STATUS_ACCEPTED : AcquisitionLead::STATUS_DECLINED, 'closed_by' => 'seller']);

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
