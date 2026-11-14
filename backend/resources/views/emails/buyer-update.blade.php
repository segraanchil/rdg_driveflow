<!doctype html>
<html>
<body style="margin:0; padding:24px; background:#f1f5f9; font-family: Arial, sans-serif; color:#0f172a;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0;">
        <div style="background:#141414; padding:18px 24px; color:#ffffff; font-weight:bold; font-size:16px; letter-spacing:1px; text-transform:uppercase;">
            RDG <span style="color:#d4d4d4; font-weight:normal; font-size:12px; letter-spacing:2px;">Car Deals &amp; Services</span>
        </div>
        <div style="padding:24px;">
            <p style="margin:0 0 12px;">Hi {{ $name }},</p>
            <h2 style="margin:0 0 12px; font-size:18px;">{{ $heading }}</h2>
            @foreach ($lines as $line)
                <p style="margin:0 0 10px; line-height:1.5; color:#334155;">{{ $line }}</p>
            @endforeach
            @if ($ctaLabel && $ctaUrl)
                <p style="margin:20px 0 0;">
                    <a href="{{ $ctaUrl }}" style="display:inline-block; background:#141414; color:#ffffff; text-decoration:none; padding:10px 18px; border-radius:8px; font-weight:bold;">{{ $ctaLabel }}</a>
                </p>
            @endif
        </div>
        <div style="padding:14px 24px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8;">
            This is an automated message from RDG Car Deals &amp; Services.
        </div>
    </div>
</body>
</html>
