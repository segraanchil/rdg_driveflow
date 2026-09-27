# RDG DriveFlow

Dealership Management System with a 360-degree virtual showroom for **RDG Car
Deals & Services**, a secondhand car dealership. This file orients future
sessions — read it before making structural changes.

## Git commit conventions

Do **not** add a `Co-Authored-By: Claude ...` trailer to commit messages or
pull request descriptions in this repository — commit as the repository
owner only. This overrides Claude Code's default attribution behavior for
this project specifically.

## Tech stack

- **Frontend**: `frontend/` — React 18 + Vite + Tailwind CSS, installable PWA
  (`vite-plugin-pwa`, manifest + service worker configured in `vite.config.js`)
- **Backend**: `backend/` — Laravel 11, API-only (no Blade UI beyond PDF views)
- **Primary DB**: MySQL via Eloquent
- **Real-time**: Firebase Realtime Database — **chatbot + live dashboard
  notifications only**, never core business data
- **Auth**: Laravel Sanctum (SPA cookie sessions) + a 6-digit code emailed on
  every login, for **all four roles** (see "Auth flow" below)
- **PDF generation**: `barryvdh/laravel-dompdf` (invoices, Deed of Sale,
  Official Receipt)
- **Hosting target**: standard LAMP + SSL

Two independent projects, deliberately not a monorepo tool (no shared
package.json/composer.json at root) — deploy backend and frontend separately.

## Folder structure

```
rdg_driveflow/
├── backend/                Laravel API
│   ├── app/Http/Controllers/{Auth,Buyer,Seller,Admin,Ceo}/
│   ├── app/Http/Middleware/  EnsureRole.php, EnsureMfaVerified.php
│   ├── app/Models/             12 Eloquent models (10 from the ERD + VehicleMedia, SavedVehicle pivot)
│   ├── app/Services/Firebase/  FirebaseService.php (no-ops until configured)
│   ├── app/Console/Commands/   ExpireReservations.php (reservations:expire)
│   ├── database/migrations/    2024_01_01_0000{01..12}_create_*_table.php
│   ├── routes/api.php         all routes, grouped by role
│   └── config/firebase.php    Firebase project config (blank by default)
└── frontend/                React PWA
    ├── src/pages/{auth,buyer,seller,admin,ceo}/
    ├── src/components/{layout,vehicles,chatbot}/
    ├── src/context/AuthContext.jsx
    ├── src/routes/ProtectedRoute.jsx
    └── src/firebase/config.js  Firebase client (no-ops until configured)
```

## User roles

| Role | Login required | Notes |
|---|---|---|
| Retail Buyer | No (browsing); yes to reserve/finance/claim | `users.role = 'buyer'` |
| Private Seller | No (browsing); yes to submit a lead | `users.role = 'seller'` |
| Administrative Staff | **Yes, MFA-gated** | `users.role = 'admin'` |
| CEO / Management | **Yes, MFA-gated** | `users.role = 'ceo'`, shares Acquisition Lead review with Admin |

Browsing (inventory, vehicle detail, loan calculator) stays anonymous for
everyone per the docu's explicit preconditions. The moment a buyer/seller
does something account-scoped (reserve, apply for financing, submit a
lead, file a warranty claim), they need a registered + MFA-verified
session -- same requirement as Admin/CEO, not a lighter version of it.

### Auth flow -- every role, same mechanism

1. `POST /api/auth/register` (buyer/seller only -- Admin/CEO accounts are
   provisioned manually) creates the account, logs in, and **trusts that
   first session without an MFA challenge** (they just proved control of it
   by registering -- matches the docu treating "Create Account" and "Login
   via MFA" as separate use cases). `frontend/src/pages/auth/Register.jsx`.
2. `POST /api/auth/login` (all 4 roles, same endpoint) checks the password,
   then **always** generates a 6-digit code (`User::generateMfaCode()`),
   emails it via `App\Mail\LoginOtpMail`, and marks the session
   `mfa_verified = false`. `requiresMfa()` on the model is unconditionally
   `true` now -- there's no role branch.
3. `POST /api/auth/mfa/verify` checks the code against the hash + 5-minute
   expiry (`User::verifyMfaCode()`); on success sets `mfa_verified = true`
   and clears the code. `POST /api/auth/mfa/resend` re-sends a fresh one.
4. Every account-gated route (`buyer`, `seller`, `admin`, `ceo`, `shared`
   groups in `routes/api.php`) carries both `role:...` and `mfa` middleware.
   `GET /api/auth/me` reports `{ user, mfa_verified }` so the frontend can
   recover MFA state after a page refresh mid-flow.
5. Frontend: `pages/auth/{Login,Register,Mfa}.jsx` are shared by all four
   roles -- one login form, one MFA-code form, redirecting afterward based on
   `user.role` (`admin` to inventory, `ceo` to dashboard, buyer/seller to
   wherever `ProtectedRoute` sent them, default `/`).

`users.mfa_secret` (from the original ERD) is repurposed to hold the *hash
of the current pending OTP code*, not a persistent TOTP seed -- paired with
a `mfa_code_expires_at` column added on top of the ERD's fields. There's no
enrollment step; a fresh code is generated every login. `MAIL_MAILER=log` by
default, so codes land in `storage/logs/laravel.log` instead of a real inbox
until real SMTP credentials are configured.

`users.password_hash` (not Laravel's default `password`) — `User::getAuthPassword()`
is overridden to point at it; keep that in mind if you touch auth internals.

**Email verification (Story 01/02)** -- separate from the MFA login email
above, and doesn't gate anything. `RegisterController::register()` sends
`App\Mail\VerifyEmailMail` with a `URL::temporarySignedRoute()` link
(1-hour expiry). `GET /api/auth/verify-email/{id}/{hash}` (outside
`auth:sanctum`, protected only by the `signed` middleware -- the email is
often opened in a different browser context than the one that registered)
checks `hash_equals(sha1($user->email), $hash)`, sets `email_verified_at`,
and redirects to `{FRONTEND_URL}/email-verified?status=success|invalid`.
`frontend/src/pages/auth/EmailVerified.jsx` renders that landing page. This
satisfies the acceptance criteria without changing the existing
trust-first-session behavior -- an unverified buyer/seller can still use
the app immediately after registering, same as before.

## Database

14 migrations. The original 10 match the ERD exactly: `users`, `vehicles`,
`reservations`, `financing_applications`, `financing_documents`,
`acquisition_leads`, `sales`, `legal_documents`, `warranty_claims`,
`expansion_fund_ledger`. Three more were added after docu reviews surfaced
real gaps (see `backend/database/migrations/` for exact columns):

- `vehicle_media` (2024_01_01_000011) — 360° rotation frames + still photos
  per vehicle (`type` enum `360_frame`/`photo`, `sort_order`). Nothing in
  the original ERD stored vehicle photos at all.
- `saved_vehicles` (2024_01_01_000012) — buyer↔vehicle pivot for "My
  Garage" favorites (`User::savedVehicles()` / `Vehicle::savedByBuyers()`).
- `test_drives` (2024_01_01_000013) — new Schedule Test Drive feature,
  buyer-facing button next to Reserve Vehicle on the vehicle detail page.
  `vehicle_id`, `buyer_id`, `preferred_at`, `note`, `status`
  (`pending`/`confirmed`/`declined`/`completed`/`cancelled`), `admin_notes`.
  Deliberately never touches `vehicles.status` in either direction —
  scheduling or confirming a test drive does not lock the vehicle, so it
  can still be reserved or sold to someone else before the appointment
  (shown as an explicit warning on `frontend/src/pages/buyer/TestDrive.jsx`
  and under the button on `VehicleDetail.jsx`). Buyer: `Buyer\TestDriveController`
  (`GET/POST /api/buyer/test-drives`). Admin: `Admin\TestDriveController`
  (`GET /api/admin/test-drives`, `PATCH .../confirm`, `PATCH .../decline`),
  UI at `frontend/src/pages/admin/TestDrives.jsx`. Docu term is "Request
  Test Drive" (formal use-case name, since Admin still has to confirm it);
  the UI button reads "Schedule Test Drive".
- `users.is_active` (2024_01_01_000014) — Backlog Story 28, "Manage Users
  (Admin Accounts)": CEO can add/edit/deactivate Administrative Staff
  accounts. `LoginController::login()` rejects a deactivated account with
  a 422 before it ever reaches MFA. Scoped to `role = admin` only (buyer/
  seller are self-service; CEO accounts aren't managed through this
  screen). Backend: `Ceo\StaffController` (`GET/POST /api/ceo/staff`,
  `PATCH .../{staff}`, `PATCH .../{staff}/activate|deactivate`). Frontend:
  `frontend/src/pages/ceo/StaffManagement.jsx` (`/ceo/staff`, "Manage
  Admins" in the CEO sidebar).
- `legal_documents.doc_type` enum gained `'invoice'` alongside
  `deed_of_sale`/`official_receipt` — invoices are generated-PDF-tied-to-a-
  sale records just like the other two, so `InvoiceController` now writes a
  `legal_documents` row too instead of only touching disk.

`App\Http\Controllers\Admin\SaleController` (`POST /api/admin/sales`, not in
the original ERD) is what actually creates a `Sale` — invoice and
legal-document generation both need a `sale_id` to attach to, and nothing
else creates that row. It also logs an `expansion_fund_ledger` entry per
sale (contribution formula is a placeholder 5% — confirm the real figure
with the CEO). Admin UI for this is `frontend/src/pages/admin/Sales.jsx`.

## Firebase — not yet configured

No Firebase project exists. Both `backend/app/Services/Firebase/FirebaseService.php`
and `frontend/src/firebase/config.js` detect missing credentials and no-op /
degrade gracefully instead of crashing, so the app runs fully without it
(chat widget just shows "temporarily unavailable"). **Ask the user before
creating a Firebase project** — fill in `FIREBASE_*` (backend `.env`) and
`VITE_FIREBASE_*` (frontend `.env`) once one exists.

## Feature status

As of the last full build pass, every core workflow in the docu's Product
Backlog is reachable end-to-end through the UI and was smoke-tested for
real (not just unit-level): register → browse → save a vehicle → reserve
→ admin verifies → admin records the sale → generates invoice/deed/OR →
buyer sees it in purchase history → buyer files a warranty claim; buyer
financing application → checklist → document upload → admin verifies;
seller submits a lead → tracks it → reappears in "My Submissions"; admin
edits inventory + uploads 360 photos. See git history / the migrations
above for exactly what changed in that pass.

Test Drive scheduling (buyer picks a vehicle → schedules a slot → Admin
confirms/declines) is wired end-to-end in code but **not yet migrated
locally** — a standalone `MySQL80` Windows service was occupying port 3306
instead of XAMPP's MariaDB when this was built, so
`php artisan migrate --path=database/migrations/2024_01_01_000013_create_test_drives_table.php`
still needs to run once that's sorted (see "Local setup" below).

**Fixed along the way, not just scaffolded:**
- Reservations lock the vehicle (`status = reserved`) the moment they're
  *submitted*, not only once Admin verifies — otherwise two buyers could
  reserve the same car during the pending window, exactly what Story 19's
  countdown timer is supposed to prevent. `Buyer\ReservationController::store()`
  uses `lockForUpdate()` inside a transaction to close the race properly.
  Rejecting a reservation now correctly reverts the vehicle to `available`
  (`Admin\ReservationQueueController::reject()` — it silently didn't before).
- 48-hour reservation expiry: `Reservation::expireOverdue()` runs lazily at
  the top of every reservation-reading endpoint (no cron/queue worker in
  this deployment), plus `php artisan reservations:expire` for a real cron.
- `resources/views/pdf/deed_of_sale.blade.php` rewritten to the actual
  Philippine notarial "Deed of Sale of Motor Vehicle" format (Vendor/Vendee
  terminology, vehicle-details table, consideration in words + figures via
  `App\Support\NumberToWords`, Acknowledgement section, Doc/Page/Book/Series
  notarial block) instead of a simplified "Deed of Absolute Sale." Buyer
  name and Make/Year Model auto-fill from `$sale`; Vendor is hardcoded to
  RDG Car Deals & Services / CEO Albani Galo (real, known identity, not a
  placeholder). **Gap, not filled in**: Series (model), Type of Body, OR
  No., Motor No., Serial/Chassis No., Plate No., File No., and C.R. No.
  print as blank underscore lines — `vehicles` has no columns for any of
  these LTO registration details, and nothing in Admin's inventory form
  collects them either. A plain-text mirror of the blank template lives at
  `resources/templates/deed_of_sale_of_motor_vehicle.txt` for reference.

**Still placeholder, deliberately** (confirm real figures with the business
before launch, not blocking functionality):
- Loan amortization formula, expansion-fund contribution % (5%), and the
  financing document checklist per employment profile.
- `MarginSettingController` caches the global margin instead of using a
  dedicated `settings` table — fine unless it needs to survive a cache
  flush or be audited.
- Registration doesn't send a verification email (separate concern from
  the MFA login email, which does work) — docu Story 01/02 expects one.
- AI chatbot has no automatic high-intent-detection escalation (Story 17)
  — only the manual "talk to a human" button. Needs an AI provider API key
  (ask before setting one up) to do more than that.
- `frontend/public/icons/*.svg` are placeholder "R" icons.
- No automated tests yet.
- Global margin % changes only apply to vehicles added afterward, not a
  repricing pass over existing inventory — open question, not a bug.

## Local setup

Fully set up and verified working on this machine as of the scaffolding date
— `composer install`, `npm install`, migrations, and both dev servers have
all run successfully. Composer was installed manually to `C:\composer\composer.phar`
(wrapped by `C:\composer\composer.bat`, since it isn't on Packagist's winget
source) and Node.js LTS via winget; both `C:\xampp\php` and `C:\composer`
were added to the User `PATH`, and Node's installer added itself to the
Machine `PATH` — a **new terminal** (this session's shell had the old PATH
cached) will have `php`, `composer`, `node`, and `npm` directly.

A separate standalone MySQL 8.0 Windows service briefly conflicted with
XAMPP's MariaDB on port 3306 during setup; it was stopped once, but it's
registered as `AUTO_START` (`sc qc MySQL80` shows
`C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe`), so it comes back
and re-occupies 3306 after a reboot even though it was never fully
uninstalled. When `php artisan migrate`/`serve` suddenly can't connect
("Access denied for user 'root'@'localhost' (using password: NO)"), that's
this service again grabbing 3306 before XAMPP's MariaDB can — check with
`sc query MySQL80`, stop it (`net stop MySQL80`, needs an elevated
terminal) or uninstall it properly, then start XAMPP's MySQL. Everything
(this project, `omnidrive`, `batasan_connect`) is meant to run on the
standard 3306 — `DB_PORT` in `backend/.env` doesn't need any special value
once XAMPP's MariaDB actually owns the port.

To start both servers day-to-day (XAMPP's Apache/MySQL don't need to be
running via the XAMPP Control Panel — MySQL was started directly as its own
process; `php artisan serve` is a self-contained dev server, not through
Apache):

```bash
# Backend — http://localhost:8000
cd backend && php artisan serve

# Frontend — http://localhost:5173
cd frontend && npm run dev
```

Rebuild from scratch on a new machine:

```bash
# Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
# create a `rdg_driveflow` MySQL database, then:
php artisan migrate --seed   # seeds a test admin + CEO account (see DatabaseSeeder)
php artisan storage:link
php artisan serve            # http://localhost:8000

# Frontend
cd frontend
npm install
cp .env.example .env
npm run dev                  # http://localhost:5173
```

Note: `vite.config.js` sets `server.host = true` so Vite binds all interfaces
— on at least this machine, Vite's default "localhost" binding resolved to
IPv6 loopback only (`[::1]`), which some HTTP clients couldn't reach over
`127.0.0.1`. Keep that setting rather than reverting to the Vite default.

Note: `frontend/src/api/client.js` sets `withXSRFToken: true` on the axios
instance. Without it, every POST/PATCH/DELETE 419s with a CSRF token
mismatch in a real browser (curl/Postman/PowerShell won't catch this —
they don't replicate axios's same-origin check). Frontend (`:5173`) and
API (`:8000`) are different origins, and axios only auto-attaches the
`X-XSRF-TOKEN` header from the cookie for same-origin requests unless this
is explicitly set. Keep it — this isn't optional for this architecture.

Seeded test accounts (local only — change before any real deployment):
`admin@rdgcardeals.test` / `password`, `ceo@rdgcardeals.test` / `password`.
Logging in emails a 6-digit code that must be submitted to
`POST /api/auth/mfa/verify` before the `mfa` middleware lets the session
through — with the default `MAIL_MAILER=log`, check
`storage/logs/laravel.log` for the code during local testing.
