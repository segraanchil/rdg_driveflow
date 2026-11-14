<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Models\FinancingApplication;
use App\Models\FinancingDocument;
use App\Models\Setting;
use App\Models\Vehicle;
use App\Support\AdminAlert;
use App\Support\ImageShrinker;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Bank financing path: application + per-employment-profile document checklist. Auth required. */
class FinancingApplicationController extends Controller
{
    public function checklist(string $employmentProfile)
    {
        abort_unless(array_key_exists($employmentProfile, FinancingApplication::CHECKLISTS), 404);

        return response()->json([
            'documents' => array_keys(FinancingApplication::CHECKLISTS[$employmentProfile]),
            'requirements' => FinancingApplication::requirements($employmentProfile),
            'annual_interest_rate' => Setting::loanRate($employmentProfile),
        ]);
    }

    public function index(Request $request)
    {
        return response()->json(
            $request->user()->financingApplications()->with(['vehicle', 'documents'])->latest()->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'vehicle_id' => ['required', 'exists:vehicles,id'],
            'employment_profile' => ['required', Rule::in(array_keys(FinancingApplication::CHECKLISTS))],
            'term_months' => ['required', 'integer', 'min:12', 'max:60'],
            'down_payment' => ['required', 'numeric', 'min:0'],
        ]);

        $vehicle = Vehicle::findOrFail($data['vehicle_id']);
        abort_if($vehicle->status === Vehicle::STATUS_SOLD, 422, 'This car has already been sold.');

        $estimate = LoanCalculatorController::amortize(
            (float) $vehicle->selling_price,
            (float) $data['down_payment'],
            (int) $data['term_months'],
            Setting::loanRate($data['employment_profile']),
        );

        $application = FinancingApplication::create([
            ...$data,
            'buyer_id' => $request->user()->id,
            'monthly_amortization' => $estimate['monthly_amortization'],
            'status' => 'pending',
        ]);

        AdminAlert::notify('financing', 'New financing application', "{$request->user()->name} applied for financing on the {$vehicle->year} {$vehicle->make} {$vehicle->model}.", '/admin/financing');

        return response()->json($application->load('documents'), 201);
    }

    public function uploadDocument(Request $request, FinancingApplication $application)
    {
        abort_unless($application->buyer_id === $request->user()->id, 403);

        $data = $request->validate([
            'doc_type' => ['required', 'string', Rule::in($application->required_documents)],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        $path = ImageShrinker::shrinkStored($request->file('file')->store('uploads/financing_documents', 'public'));

        $document = FinancingDocument::create([
            'application_id' => $application->id,
            'file_path' => $path,
            'doc_type' => $data['doc_type'],
            'verified' => false,
        ]);

        AdminAlert::notify('financing', 'Financing document uploaded', "{$request->user()->name} uploaded ".str_replace('_', ' ', $data['doc_type'])." for application #{$application->id}.", '/admin/financing');

        return response()->json($document, 201);
    }
}
