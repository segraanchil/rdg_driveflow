<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #14213d; margin: 0; }
        .header { border-bottom: 3px solid #14213d; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; }
        .header p { margin: 2px 0; color: #555; }
        .meta { width: 100%; margin-bottom: 20px; }
        .meta td { vertical-align: top; padding: 2px 0; }
        .meta .label { color: #777; font-size: 10px; text-transform: uppercase; }
        table.items { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.items th { text-align: left; background: #f0f2f5; padding: 8px; font-size: 10px; text-transform: uppercase; border-bottom: 2px solid #14213d; }
        table.items td { padding: 8px; border-bottom: 1px solid #ddd; }
        .total-row td { border-bottom: none; padding-top: 14px; font-size: 15px; font-weight: bold; }
        .footer { margin-top: 40px; font-size: 10px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>RDG Car Deals &amp; Services</h1>
        <p>143 Commonwealth Avenue, Quezon City, Philippines</p>
    </div>

    <h2 style="margin-bottom: 4px;">SALES INVOICE</h2>

    <table class="meta">
        <tr>
            <td width="50%">
                <div class="label">Invoice No.</div>
                INV-{{ str_pad($sale->id, 6, '0', STR_PAD_LEFT) }}
                <div class="label" style="margin-top: 8px;">Date</div>
                {{ \Illuminate\Support\Carbon::parse($sale->sale_date)->format('F j, Y') }}
            </td>
            <td width="50%">
                <div class="label">Billed To</div>
                {{ $sale->buyer->name }}<br>
                {{ $sale->buyer->email }}
            </td>
        </tr>
    </table>

    <table class="items">
        <thead>
            <tr>
                <th>Description</th>
                <th>Payment Type</th>
                <th style="text-align: right;">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    {{ $sale->vehicle->year }} {{ $sale->vehicle->make }} {{ $sale->vehicle->model }}<br>
                    <span style="color: #777;">{{ number_format($sale->vehicle->mileage) }} km</span>
                </td>
                <td style="text-transform: capitalize;">{{ str_replace('_', ' ', $sale->payment_type) }}</td>
                <td style="text-align: right;">&#8369;{{ number_format($sale->total_amount, 2) }}</td>
            </tr>
            <tr class="total-row">
                <td colspan="2" style="text-align: right;">Total Due</td>
                <td style="text-align: right;">&#8369;{{ number_format($sale->total_amount, 2) }}</td>
            </tr>
        </tbody>
    </table>

    <div class="footer">
        Thank you for choosing RDG Car Deals &amp; Services. This invoice was generated on
        {{ now()->format('F j, Y g:i A') }}.
    </div>
</body>
</html>
