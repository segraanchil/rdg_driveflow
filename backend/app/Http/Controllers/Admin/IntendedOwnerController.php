<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\IntendedOwner;
use App\Models\LegalDocument;
use App\Models\Reservation;
use App\Models\Sale;
use App\Models\User;
use App\Support\BuyerNotice;
use App\Support\OwnerRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Vehicle owners: staff check the driver's license a buyer uploaded for the person to be named on the
 * Deed of Sale, fill in or correct the details, then approve. Approved details print on the Deed.
 */
class IntendedOwnerController extends Controller
{
    /** ?status=pending (default) | approved | rejected */
    public function index(Request $request)
    {
        $status = $request->input('status', IntendedOwner::STATUS_PENDING);

        return response()->json([
            ...IntendedOwner::relevant()
                ->with(['buyer:id,name,email,phone', 'vehicle:id,make,model,year,status'])
                ->where('status', $status)
                ->when($status === IntendedOwner::STATUS_PENDING, fn ($q) => $q->oldest('updated_at'), fn ($q) => $q->latest('updated_at'))
                ->paginate(50)->toArray(),
            'counts' => ['pending' => IntendedOwner::relevant()->where('status', IntendedOwner::STATUS_PENDING)->count()],
        ]);
    }

    public function license(IntendedOwner $owner, string $side)
    {
        return OwnerRequests::licenseResponse($owner, $side);
    }

    /** Saves the details checked against the license and approves the owner (also used to correct an approved one). */
    public function approve(Request $request, IntendedOwner $owner)
    {
        $data = $request->validate(OwnerRequests::staffRules(), OwnerRequests::messages());
        $firstApproval = $owner->status !== IntendedOwner::STATUS_APPROVED;

        $owner->update([...$data, ...$this->reviewed($request, IntendedOwner::STATUS_APPROVED)]);
        $this->applyToSale($owner);

        if ($firstApproval) {
            $v = $owner->vehicle;
            BuyerNotice::send($owner->buyer, 'The new owner’s details are approved', [
                "{$owner->full_name} will be named as the owner of the {$v->year} {$v->make} {$v->model} on the Deed of Sale.",
                'If anything needs to change, tell our staff before the Deed is signed.',
            ], 'View My Garage', '/garage');
        }

        return response()->json($this->fresh($owner));
    }

    public function reject(Request $request, IntendedOwner $owner)
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:300']], ['reason.required' => 'Tell the buyer what to fix.']);

        if (Sale::where('intended_owner_id', $owner->id)->exists()) {
            throw ValidationException::withMessages(['owner' => ['This owner is already on a recorded sale. Edit the details, or switch the Deed back to the buyer’s name.']]);
        }

        $owner->update([...$this->reviewed($request, IntendedOwner::STATUS_REJECTED), 'rejection_reason' => $data['reason']]);

        $v = $owner->vehicle;
        BuyerNotice::send($owner->buyer, 'Please check the new owner’s driver’s license', [
            "We couldn’t accept the owner details for the {$v->year} {$v->make} {$v->model}. Reason: {$data['reason']}",
            'Upload the license again from My Garage, or keep the car under your own name.',
        ], 'View My Garage', '/garage');

        return response()->json($this->fresh($owner));
    }

    /** Staff add an owner themselves (walk-in buyers, or a change after the sale is recorded). */
    public function store(Request $request)
    {
        $data = $request->validate([
            'buyer_id' => ['required', Rule::exists('users', 'id')->where('role', User::ROLE_BUYER)],
            'vehicle_id' => ['required', 'exists:vehicles,id'],
            'owner_license_front' => ['required', 'file', 'image', 'max:10240'],
            'owner_license_back' => ['nullable', 'file', 'image', 'max:10240'],
            ...OwnerRequests::staffRules(),
        ], OwnerRequests::messages());

        $same = fn ($q) => $q->where('buyer_id', $data['buyer_id'])->where('vehicle_id', $data['vehicle_id']);
        $linked = $same(Sale::query())->exists()
            || $same(Reservation::query())->whereIn('status', [Reservation::STATUS_PENDING, Reservation::STATUS_VERIFIED])->exists();
        if (! $linked) {
            throw ValidationException::withMessages(['buyer_id' => ['This buyer has no active reservation or sale for that car.']]);
        }

        $owner = OwnerRequests::save(IntendedOwner::findFor((int) $data['buyer_id'], (int) $data['vehicle_id']), $request, [
            ...collect($data)->except(['owner_license_front', 'owner_license_back'])->all(),
            ...$this->reviewed($request, IntendedOwner::STATUS_APPROVED),
        ]);
        $this->applyToSale($owner);

        return response()->json($this->fresh($owner), 201);
    }

    /** Switches the Deed of Sale back to the buyer's own name. */
    public function destroy(IntendedOwner $owner)
    {
        $sale = Sale::where('intended_owner_id', $owner->id)->first();
        DB::transaction(function () use ($owner, $sale) {
            $sale?->update(['intended_owner_id' => null]);
            $owner->delete();
        });
        $this->refreshDocuments($sale);

        return response()->json(null, 204);
    }

    private function reviewed(Request $request, string $status): array
    {
        return ['status' => $status, 'rejection_reason' => null, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()];
    }

    /** A sale recorded before the owner was approved or changed gets the new owner too. */
    private function applyToSale(IntendedOwner $owner): void
    {
        $sale = Sale::where('buyer_id', $owner->buyer_id)->where('vehicle_id', $owner->vehicle_id)->latest('id')->first();
        $sale?->update(['intended_owner_id' => $owner->id]);
        $this->refreshDocuments($sale);
    }

    /** A Deed or invoice that was already generated must not keep the old owner's name. */
    private function refreshDocuments(?Sale $sale): void
    {
        $types = $sale?->legalDocuments()->pluck('doc_type') ?? collect();
        if ($types->contains(LegalDocument::TYPE_DEED_OF_SALE)) {
            LegalDocumentController::generate($sale->fresh(), LegalDocument::TYPE_DEED_OF_SALE);
        }
        if ($types->contains(LegalDocument::TYPE_INVOICE)) {
            InvoiceController::generate($sale->fresh());
        }
    }

    private function fresh(IntendedOwner $owner): IntendedOwner
    {
        return $owner->fresh(['buyer:id,name,email,phone', 'vehicle:id,make,model,year,status']);
    }
}
