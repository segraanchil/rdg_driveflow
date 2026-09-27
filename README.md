# RDG DriveFlow

A web-based Dealership Management System with a 360-degree panoramic virtual
showroom, built for **RDG Car Deals & Services**, a secondhand car dealership
in Quezon City, Philippines.

Developed as the technical deliverable for **MSYADD1 — Systems Analysis and
Detailed Design for IT**, School of Computing and Information Technologies,
NU Fairview.

## What it does

RDG DriveFlow replaces a dealership's manual spreadsheets and Facebook
Messenger workflow with a single system covering the full sale lifecycle:

- **360° virtual showroom** — buyers can browse, filter, and inspect vehicles
  remotely with a drag-to-rotate viewer and a "Last Updated" timestamp
- **Vehicle reservation** with proof-of-payment upload, automatic 48-hour
  holding timer, and double-booking prevention
- **Schedule Test Drive** — a lighter-weight alternative to reserving; the
  buyer picks a preferred date/time, Admin confirms or declines, and the
  vehicle is never locked in the process
- **Bank financing** applications with an employment-profile-based document
  checklist and secure upload/verification pipeline
- **"Sell Your Car"** portal for private sellers to submit a vehicle for
  dealership appraisal and acquisition
- **Automated pricing** — Admin enters acquisition cost and repair fees, the
  system applies the dealership's global profit margin (10–18%) automatically
- **One-click legal document generation** — Invoice, Deed of Sale, and
  Official Receipt as PDFs, auto-filled from the sale record
- **Expansion Fund tracking** and a live executive dashboard for the CEO
- **Warranty claims** covering the dealership's 1-month money-back guarantee
- **AI-assisted chat** with escalation to a human agent
- Role-based accounts for **Retail Buyer**, **Private Seller**,
  **Administrative Staff**, and **CEO / Management**, all behind
  email-based multi-factor authentication

## Tech stack

| | |
|---|---|
| **Frontend** | React 18 + Vite + Tailwind CSS, installable as a PWA |
| **Backend** | Laravel 11 (API-only) |
| **Database** | MySQL |
| **Real-time** | Firebase Realtime Database (chat + live dashboard notifications only — never core business data) |
| **Auth** | Laravel Sanctum (SPA cookie sessions) + emailed one-time codes for every role |
| **PDF generation** | `barryvdh/laravel-dompdf` |

The `backend/` and `frontend/` folders are two independent projects (no
shared root `package.json`/`composer.json`) — deploy them separately.

## Getting started

Requires PHP 8.2+, Composer, Node.js LTS, and MySQL.

```bash
# Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
# create a `rdg_driveflow` MySQL database, set DB_* in .env, then:
php artisan migrate --seed      # seeds a test Admin + CEO account
php artisan storage:link
php artisan serve               # http://localhost:8000

# Frontend
cd frontend
npm install
cp .env.example .env
npm run dev                     # http://localhost:5173
```

Seeded test accounts (local only — change before any real deployment):

- `admin@rdgcardeals.test` / `password`
- `ceo@rdgcardeals.test` / `password`

Every login (all four roles) emails a 6-digit verification code. With the
default `MAIL_MAILER=log`, that code lands in `backend/storage/logs/laravel.log`
instead of a real inbox — check there during local testing.

Buyer and Seller accounts aren't seeded; register one from the app's sign-up
page.

## Firebase (optional)

The chat widget and live dashboard notifications run on Firebase Realtime
Database. No project is configured by default — both
`backend/app/Services/Firebase/FirebaseService.php` and
`frontend/src/firebase/config.js` detect missing credentials and degrade
gracefully (the chat widget shows "temporarily unavailable"), so the rest of
the app runs fully without it. Fill in `FIREBASE_*` (backend `.env`) and
`VITE_FIREBASE_*` (frontend `.env`) once a Firebase project exists.

## Project structure

```
rdg_driveflow/
├── backend/                Laravel API
│   ├── app/Http/Controllers/{Auth,Buyer,Seller,Admin,Ceo}/
│   ├── app/Models/
│   ├── database/migrations/
│   └── routes/api.php      all routes, grouped by role
└── frontend/                React PWA
    ├── src/pages/{auth,buyer,seller,admin,ceo}/
    ├── src/components/{layout,vehicles,chatbot}/
    └── src/context/AuthContext.jsx
```

## Status

Every core workflow in the product backlog is implemented and reachable
end-to-end through the UI: register → browse → save a vehicle → reserve →
Admin verifies → Admin records the sale → generates invoice/deed/OR; buyer
financing application → checklist → document upload → Admin verifies; buyer
schedules a test drive → Admin confirms/declines; seller submits a lead →
tracks it → Admin/CEO reviews it.

Deliberately left as placeholders, pending real figures from the business:
the loan amortization formula, the Expansion Fund contribution percentage,
and the financing document checklist per employment profile.
