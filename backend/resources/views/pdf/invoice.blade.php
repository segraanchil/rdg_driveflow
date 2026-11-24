<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #141414; margin: 0; }
        .header { border-bottom: 3px solid #141414; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; }
        .header p { margin: 2px 0; color: #555; }
        .meta { width: 100%; margin-bottom: 20px; }
        .meta td { vertical-align: top; padding: 2px 0; }
        .meta .label { color: #777; font-size: 10px; text-transform: uppercase; }
        table.items { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.items th { text-align: left; background: #f0f2f5; padding: 8px; font-size: 10px; text-transform: uppercase; border-bottom: 2px solid #141414; }
        table.items td { padding: 8px; border-bottom: 1px solid #ddd; }
        table.summary { width: 55%; margin-left: 45%; border-collapse: collapse; margin-top: 14px; }
        table.summary td { padding: 6px 8px; }
        table.summary td.amount { text-align: right; }
        table.summary tr.less td { color: #b42318; }
        table.summary tr.total td { border-top: 2px solid #141414; font-size: 15px; font-weight: bold; padding-top: 10px; }
        .note { margin-top: 18px; padding: 10px; background: #f6f8fa; border-left: 3px solid #141414; font-size: 11px; color: #444; }
        .footer { margin-top: 40px; font-size: 10px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
    </style>
</head>
<body>
    @php
        $price = (float) $sale->total_amount;
        $reservationFee = (float) ($sale->reservation?->fee_amount ?? 0);
        $isFinancing = $sale->payment_type === 'financing';
        $downPayment = $isFinancing ? (float) ($downPayment ?? 0) : 0;
        $financed = $isFinancing ? max(0, $price - $downPayment) : 0;
        $dueOnRelease = $isFinancing ? max(0, $downPayment - $reservationFee) : max(0, $price - $reservationFee);
    @endphp

    <table class="header" style="width: 100%;">
        <tr>
            <td style="width: 120px; vertical-align: middle;"><img src="{{ resource_path('images/logo-black.jpg') }}" alt="RDG Car Deals & Services" style="height: 66px;"></td>
            <td style="vertical-align: middle;">
                <h1>RDG Car Deals &amp; Services</h1>
                <p>{{ $business['business_address'] }}</p>
                @if ($business['business_phone'] || $business['business_email'])
                    <p>{{ collect([$business['business_phone'], $business['business_email']])->filter()->implode(' · ') }}</p>
                @endif
            </td>
        </tr>
    </table>

    <h2 style="margin-bottom: 4px;">SALES INVOICE</h2>

    <table class="meta">
        <tr>
            <td width="50%">
                <div class="label">Invoice No.</div>
                INV-{{ str_pad($sale->id, 6, '0', STR_PAD_LEFT) }}
                <div class="label" style="margin-top: 8px;">Date</div>
                {{ \Illuminate\Support\Carbon::parse($sale->sale_date)->format('F j, Y') }}
                <div class="label" style="margin-top: 8px;">Payment Terms</div>
                {{ $isFinancing ? 'Bank Financing' : 'Straight Cash' }}
            </td>
            <td width="50%">
                <div class="label">Billed To</div>
                {{ $sale->buyer->name }}<br>
                {{ $sale->buyer->email }}
                @if ($sale->intendedOwner)
                    <div class="label" style="margin-top: 8px;">Vehicle To Be Named To</div>
                    {{ $sale->intendedOwner->full_name }}
                @endif
            </td>
        </tr>
    </table>

    <table class="items">
        <thead>
            <tr>
                <th>Description</th>
                <th>Details</th>
                <th style="text-align: right;">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    {{ $sale->vehicle->year }} {{ $sale->vehicle->make }} {{ $sale->vehicle->model }}<br>
                    <span style="color: #777;">{{ number_format($sale->vehicle->mileage) }} km
                        @if ($sale->vehicle->transmission) · {{ $sale->vehicle->transmission }} @endif
                        @if ($sale->vehicle->color) · {{ $sale->vehicle->color }} @endif
                    </span>
                </td>
                <td style="color:#555;">
                    @if ($sale->vehicle->plate_number) Plate: {{ strtoupper($sale->vehicle->plate_number) }}<br> @endif
                    @if ($sale->vehicle->chassis_number) Chassis: {{ strtoupper($sale->vehicle->chassis_number) }} @endif
                </td>
                <td style="text-align: right;">&#8369;{{ number_format($price, 2) }}</td>
            </tr>
        </tbody>
    </table>

    <table class="summary">
        <tr><td>Vehicle price</td><td class="amount">&#8369;{{ number_format($price, 2) }}</td></tr>
        @if ($isFinancing)
            <tr><td>Down payment</td><td class="amount">&#8369;{{ number_format($downPayment, 2) }}</td></tr>
            <tr><td>Amount to be financed by the bank</td><td class="amount">&#8369;{{ number_format($financed, 2) }}</td></tr>
        @endif
        @if ($reservationFee > 0)
            <tr class="less"><td>Less: reservation fee paid</td><td class="amount">&minus; &#8369;{{ number_format($reservationFee, 2) }}</td></tr>
        @endif
        <tr class="total"><td>{{ $isFinancing ? 'Down payment balance due' : 'Balance due' }}</td><td class="amount">&#8369;{{ number_format($dueOnRelease, 2) }}</td></tr>
    </table>

    <div class="note">
        @if ($isFinancing)
            The balance above is the remaining down payment, payable before the vehicle is released. The financed amount is paid by the partner bank, subject to its approval and terms.
        @else
            The balance above is payable in full before the vehicle is released.@if ($reservationFee > 0) The reservation fee has already been deducted.@endif
        @endif
    </div>

    <div class="footer">
        Thank you for choosing RDG Car Deals &amp; Services. This invoice was generated on
        {{ now()->format('F j, Y g:i A') }}.
    </div>
</body>
</html>
