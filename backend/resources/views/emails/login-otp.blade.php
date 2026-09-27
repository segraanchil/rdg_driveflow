<!doctype html>
<html>
<body style="font-family: sans-serif; color: #0f172a;">
    <p>Hi {{ $user->name }},</p>
    <p>Your {{ config('app.name') }} login code is:</p>
    <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">{{ $code }}</p>
    <p>This code expires in {{ $minutes }} minutes. If you didn't try to log in, you can ignore this email.</p>
</body>
</html>
