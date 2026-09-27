<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #14213d; }
        .header { text-align: center; border-bottom: 3px solid #14213d; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 18px; }
        .header p { margin: 2px 0; color: #555; font-size: 11px; }
        .or-no { text-align: right; font-size: 13px; font-weight: bold; margin-bottom: 20px; }
        table.receipt { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.receipt td { padding: 8px 4px; border-bottom: 1px solid #ccc; }
        table.receipt td.label { color: #777; font-size: 10px; text-transform: uppercase; width: 30%; }
        .amount-box { margin-top: 24px; padding: 16px; background: #f5f5f5; border: 1px solid #ccc; text-align: center; }
        .amount-box .figure { font-size: 22px; font-weight: bold; }
        .sign-block { width: 100%; margin-top: 60px; }
        .sign-block td { width: 50%; text-align: center; padding-top: 40px; }
        .sign-line { border-top: 1px solid #14213d; margin: 0 20px; padding-top: 4px; font-size: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>RDG Car Deals &amp; Services</h1>
        <p>143 Commonwealth Avenue, Quezon City, Philippines</p>
    </div>

    <h2 style="text-align: center; margin-bottom: 4px;">OFFICIAL RECEIPT</h2>
    <div class="or-no">OR No. {{ str_pad($sale->id, 6, '0', STR_PAD_LEFT) }}</div>

    <table class="receipt">
        <tr>
            <td class="label">Date</td>
            <td>{{ \Illuminate\Support\Carbon::parse($sale->sale_date)->format('F j, Y') }}</td>
        </tr>
        <tr>
            <td class="label">Received From</td>
            <td>{{ $sale->buyer->name }}</td>
        </tr>
        <tr>
            <td class="label">Payment For</td>
            <td>{{ $sale->vehicle->year }} {{ $sale->vehicle->make }} {{ $sale->vehicle->model }}</td>
        </tr>
        <tr>
            <td class="label">Payment Type</td>
            <td style="text-transform: capitalize;">{{ str_replace('_', ' ', $sale->payment_type) }}</td>
        </tr>
    </table>

    <div class="amount-box">
        <div style="font-size: 10px; text-transform: uppercase; color: #777;">Amount Received</div>
        <div class="figure">&#8369;{{ number_format($sale->total_amount, 2) }}</div>
    </div>

    <table class="sign-block">
        <tr>
            <td>
                <div class="sign-line">Authorized Signature</div>
            </td>
            <td>
                <div class="sign-line">{{ $sale->buyer->name }}<br>Buyer</div>
            </td>
        </tr>
    </table>
</body>
</html>
