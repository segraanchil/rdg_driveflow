<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Models\FinancingApplication;
use App\Models\FinancingDocument;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Bank financing path: application + per-employment-profile document checklist. Auth required. */
class FinancingApplicationController extends Controller
{
    // TODO: confirm exact required doc_type list per profile with the bank partner.
    private const DOCUMENT_CHECKLISTS = [
        'employed' => ['payslip', 'coe', 'valid_id', 'proof_of_billing'],
        'ofw' => ['coe', 'valid_id', 'proof_of_billing', 'consularized_authorization'],
        'business_owner' => ['dti_or_sec', 'itr', 'valid_id', 'bank_statement'],
    ];

    public function checklist(string $employmentProfile)
    {
        abort_unless(array_key_exists($employmentProfile, self::DOCUMENT_CHECKLISTS), 404);

        return response()->json(['documents' => self::DOCUMENT_CHECKLISTS[$employmentProfile]]);
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
            'employment_profile' => ['required', Rule::in(array_keys(self::DOCUMENT_CHECKLISTS))],
            'term_months' => ['required', 'integer', 'min:12', 'max:60'],
            'down_payment' => ['required', 'numeric', 'min:0'],
        ]);

        $application = FinancingApplication::create([
            ...$data,
            'buyer_id' => $request->user()->id,
            'status' => 'pending',
        ]);

        return response()->json($application, 201);
    }

    public function uploadDocument(Request $request, FinancingApplication $application)
    {
        abort_unless($application->buyer_id === $request->user()->id, 403);

        $data = $request->validate([
            'doc_type' => ['required', 'string'],
            'file' => ['required', 'file', 'max:10240'],
        ]);

        $path = $request->file('file')->store('uploads/financing_documents', 'public');

        $document = FinancingDocument::create([
            'application_id' => $application->id,
            'file_path' => $path,
            'doc_type' => $data['doc_type'],
            'verified' => false,
        ]);

        return response()->json($document, 201);
    }
}
