<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Support\ImageShrinker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Business settings. Public read of buyer-facing values (payment details, reservation fee,
 * loan rates, contact info); CEO read/write of everything. The global margin keeps its own
 * endpoint (MarginSettingController) because saving it also re-prices the inventory.
 */
class SettingController extends Controller
{
    public function publicIndex()
    {
        return response()->json(Setting::publicValues());
    }

    public function index()
    {
        return response()->json(Setting::allValues());
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'reservation_fee' => ['sometimes', 'numeric', 'min:0', 'max:1000000'],
            'payment_bank_name' => ['sometimes', 'nullable', 'string', 'max:80'],
            'payment_account_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'payment_account_number' => ['sometimes', 'nullable', 'string', 'max:40'],
            'payment_ewallet_name' => ['sometimes', 'nullable', 'string', 'max:40'],
            'payment_ewallet_number' => ['sometimes', 'nullable', 'string', 'max:40'],
            'loan_rate_employed' => ['sometimes', 'numeric', 'min:0', 'max:40'],
            'loan_rate_ofw' => ['sometimes', 'numeric', 'min:0', 'max:40'],
            'loan_rate_business_owner' => ['sometimes', 'numeric', 'min:0', 'max:40'],
            'expansion_fund_percent' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'expansion_fund_goal' => ['sometimes', 'numeric', 'min:0'],
            'business_address' => ['sometimes', 'nullable', 'string', 'max:200'],
            'business_hours' => ['sometimes', 'nullable', 'string', 'max:120'],
            'business_phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'business_email' => ['sometimes', 'nullable', 'email', 'max:120'],
        ]);

        Setting::put($data);

        return response()->json(Setting::allValues());
    }

    /** Payment QR code (bank / e-wallet) shown to buyers on the reservation page. */
    public function uploadQr(Request $request)
    {
        $request->validate(['qr' => ['required', 'image', 'max:5120']]);

        $old = Setting::get('payment_qr_path');
        $path = ImageShrinker::shrinkStored($request->file('qr')->store('uploads/settings', 'public'));
        Setting::put(['payment_qr_path' => $path]);

        if ($old && $old !== $path) {
            Storage::disk('public')->delete($old);
        }

        return response()->json(Setting::allValues());
    }

    public function removeQr()
    {
        $old = Setting::get('payment_qr_path');
        Setting::put(['payment_qr_path' => '']);
        if ($old) {
            Storage::disk('public')->delete($old);
        }

        return response()->json(Setting::allValues());
    }
}
