<!doctype html>
<html>
<body style="font-family: sans-serif; color: #0f172a;">
    <p>Hi {{ $user->name }},</p>
    <p>Thanks for creating an RDG DriveFlow account. Please confirm this is your email address:</p>
    <p><a href="{{ $url }}" style="display:inline-block; padding:10px 20px; background:#0f172a; color:#fff; text-decoration:none; border-radius:4px;">Verify email address</a></p>
    <p>This link expires in {{ $hours }} hour. If you didn't create this account, you can ignore this email.</p>
</body>
</html>
