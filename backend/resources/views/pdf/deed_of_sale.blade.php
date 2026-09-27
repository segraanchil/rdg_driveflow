<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 40px 50px; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 10.5px; color: #111; line-height: 1.35; }
        h1 { text-align: center; font-size: 14px; letter-spacing: 1px; margin: 0 0 14px; }
        p { text-align: justify; margin: 7px 0; }
        .blank { text-decoration: underline; }
        table.specs { width: 100%; border-collapse: collapse; margin: 10px 0; table-layout: fixed; }
        table.specs td { border: 1px solid #333; padding: 3px 6px; font-size: 10px; }
        table.specs td.label { font-weight: bold; width: 21%; }
        table.specs td.value { width: 29%; }
        .sign-block { width: 100%; margin-top: 26px; }
        .sign-block td { width: 50%; text-align: center; padding-top: 22px; }
        .sign-line { border-top: 1px solid #111; margin: 0 15px; padding-top: 3px; font-weight: bold; }
        .center { text-align: center; }
        h2.ack { text-align: center; letter-spacing: 3px; font-size: 12px; margin: 20px 0 10px; }
        table.ack { width: 100%; border-collapse: collapse; margin: 8px 0; }
        table.ack th, table.ack td { border: 1px solid #333; padding: 3px 6px; font-size: 9.5px; }
        table.ack th { background: #f0f0f0; }
        .notary-block { margin-top: 16px; }
    </style>
</head>
<body>
    <h1>DEED OF SALE OF MOTOR VEHICLE</h1>

    <p>KNOW ALL MEN BY THESE PRESENTS:</p>

    <p>
        That I, <strong>RDG CAR DEALS &amp; SERVICES</strong>, represented herein by its Chief Executive
        Officer, <strong>ALBANI GALO</strong>, Filipino, of legal age, with principal address at
        143 Commonwealth Avenue, Quezon City, Philippines, for and in consideration of the sum
        hereinafter stated, do hereby SELL, TRANSFER and CONVEY by way of Absolute Sale unto
        <strong>{{ strtoupper($sale->buyer->name) }}</strong>, Filipino, of legal age, his/her heirs,
        successors and assigns, the following described motor vehicle, to wit:
    </p>

    <table class="specs">
        <tr>
            <td class="label">MAKE</td><td class="value">{{ strtoupper($sale->vehicle->make) }}</td>
            <td class="label">SERIES</td><td class="value">{{ strtoupper($sale->vehicle->model) }}</td>
        </tr>
        <tr>
            <td class="label">TYPE OF BODY</td><td class="value blank">&nbsp;</td>
            <td class="label">YEAR MODEL</td><td class="value">{{ $sale->vehicle->year }}</td>
        </tr>
        <tr>
            <td class="label">OR NO.</td><td class="value blank">&nbsp;</td>
            <td class="label">MOTOR NO.</td><td class="value blank">&nbsp;</td>
        </tr>
        <tr>
            <td class="label">SERIAL/CHASSIS NO.</td><td class="value blank">&nbsp;</td>
            <td class="label">PLATE NO.</td><td class="value blank">&nbsp;</td>
        </tr>
        <tr>
            <td class="label">FILE NO.</td><td class="value blank">&nbsp;</td>
            <td class="label">C.R. NO.</td><td class="value blank">&nbsp;</td>
        </tr>
    </table>

    <p>
        of which motor vehicle the SELLER is the registered owner, per Certificate of Registration
        above stated, for and in consideration of the sum of
        <strong>{{ \App\Support\NumberToWords::pesos((float) $sale->total_amount) }}</strong>
        (&#8369;{{ number_format($sale->total_amount, 2) }}), Philippine Currency, receipt of which is
        hereby acknowledged to its entire satisfaction, and the SELLER hereby sells, transfers and
        conveys by way of Absolute Sale unto <strong>{{ strtoupper($sale->buyer->name) }}</strong>,
        Filipino, of legal age, his/her heirs, successors and assigns, the above-described motor
        vehicle, free from all liens and encumbrances.
    </p>

    <p>
        IN WITNESS WHEREOF, the parties have hereunto set their hands this
        <strong>{{ \Illuminate\Support\Carbon::parse($sale->sale_date)->format('jS') }}</strong> day of
        <strong>{{ \Illuminate\Support\Carbon::parse($sale->sale_date)->format('F, Y') }}</strong>, at
        <strong>Quezon City</strong>, Philippines.
    </p>

    <table class="sign-block">
        <tr>
            <td><div class="sign-line">{{ strtoupper($sale->buyer->name) }}<br>VENDEE</div></td>
            <td><div class="sign-line">RDG CAR DEALS &amp; SERVICES<br>by: ALBANI GALO, CEO<br>VENDOR</div></td>
        </tr>
    </table>

    <p class="center" style="margin-top:14px;">Signed in the presence of:</p>

    <table class="sign-block">
        <tr>
            <td><div class="sign-line">&nbsp;</div></td>
            <td><div class="sign-line">&nbsp;</div></td>
        </tr>
    </table>

    <h2 class="ack">ACKNOWLEDGEMENT</h2>

    <p>
        Republic of the Philippines&nbsp;&nbsp;&nbsp;&nbsp;)<br>
        <span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>) S.S.
    </p>

    <p>
        BEFORE ME, a Notary Public for and in the above jurisdiction, this
        <span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> day of
        <span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>,
        20<span class="blank">&nbsp;&nbsp;&nbsp;</span>, personally appeared the following persons:
    </p>

    <table class="ack">
        <tr>
            <th>NAME</th>
            <th>COMPETENT EVIDENCE OF IDENTITY</th>
            <th>DATE/PLACE ISSUED</th>
        </tr>
        <tr>
            <td>{{ strtoupper($sale->buyer->name) }}</td>
            <td class="blank">&nbsp;</td>
            <td class="blank">&nbsp;</td>
        </tr>
        <tr>
            <td>ALBANI GALO (for RDG Car Deals &amp; Services)</td>
            <td class="blank">&nbsp;</td>
            <td class="blank">&nbsp;</td>
        </tr>
    </table>

    <p>
        Known to me and to me known to be the same persons who executed the foregoing instrument
        and they acknowledged to me that the same is their free and voluntary act and deed.
    </p>

    <p>WITNESS MY HAND AND SEAL, on the date and place first above written.</p>

    <table class="sign-block">
        <tr>
            <td colspan="2" style="text-align:center; padding-top: 18px;">
                <div class="sign-line" style="display:inline-block; min-width: 240px;">&nbsp;<br><strong>Notary Public</strong></div>
            </td>
        </tr>
    </table>

    <div class="notary-block">
        <p>
            Doc. No. <span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>;<br>
            Page No. <span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>;<br>
            Book No. <span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>;<br>
            Series of 20<span class="blank">&nbsp;&nbsp;&nbsp;</span>.
        </p>
    </div>
</body>
</html>
