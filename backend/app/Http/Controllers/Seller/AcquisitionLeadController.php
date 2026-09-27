<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\AcquisitionLead;
use Illuminate\Http\Request;

/** "Sell Your Car" submission portal + appraisal status tracker. Auth required. */
class AcquisitionLeadController extends Controller
{
    public function index(Request $request)
    {
        return response()->json($request->user()->acquisitionLeads()->latest()->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'make' => ['required', 'string'],
            'model' => ['required', 'string'],
            'year' => ['required', 'integer'],
            'mileage' => ['required', 'integer', 'min:0'],
            'condition_notes' => ['nullable', 'string'],
            'photos.*' => ['file', 'image', 'max:10240'],
        ]);

        $photoPaths = collect($request->file('photos', []))
            ->map(fn ($file) => $file->store('uploads/acquisition_photos', 'public'))
            ->values()
            ->all();

        $lead = AcquisitionLead::create([
            'seller_id' => $request->user()->id,
            'vehicle_specs' => [
                'make' => $data['make'],
                'model' => $data['model'],
                'year' => $data['year'],
                'mileage' => $data['mileage'],
                'condition_notes' => $data['condition_notes'] ?? null,
            ],
            'photos_path' => $photoPaths,
            'status' => AcquisitionLead::STATUS_SUBMITTED,
        ]);

        return response()->json($lead, 201);
    }

    /** Appraisal status tracker for a single submission. */
    public function show(AcquisitionLead $lead)
    {
        abort_unless($lead->seller_id === request()->user()->id, 403);

        return response()->json($lead);
    }
}
