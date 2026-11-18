# Connecting Firebase (live Support Chat and staff alerts)

Firebase only carries **live chat messages and staff alert pings**, so they appear instantly. Every record
(reservations, sales, chat transcripts) stays in MySQL. Until these steps are done the app still works:
the chat and the notification bells just refresh every few seconds instead of instantly.

Takes about 10 minutes. You need a Google account that will own the project (ideally the dealership's).

## 1. Create the project and the database

1. Go to <https://console.firebase.google.com> and click **Create a project**.
   Name it e.g. `rdg-driveflow`. Google Analytics is not needed.
2. In the left menu: **Build → Realtime Database → Create Database**.
   - Location: **Singapore (asia-southeast1)**.
   - Security rules: **Start in locked mode**.
3. Copy the database URL shown at the top of the **Data** tab, e.g.
   `https://rdg-driveflow-default-rtdb.asia-southeast1.firebasedatabase.app`.

## 2. Paste the security rules

Open the **Rules** tab, replace everything with the contents of [`firebase/database.rules.json`](../firebase/database.rules.json),
and click **Publish**.

These rules let **only the server write**. A browser can read only its own chat (with that chat's secret token)
and the alert pings, which hold no names and no message text.

## 3. Backend key (server side)

1. Click the gear icon → **Project settings → Service accounts → Generate new private key**.
2. Rename the downloaded file to `service-account.json` and put it in
   `backend/storage/app/firebase/`. This folder is ignored by git: **never commit, email or upload this file.**
3. In `backend/.env` fill in:

   ```
   FIREBASE_PROJECT_ID=rdg-driveflow
   FIREBASE_CREDENTIALS=storage/app/firebase/service-account.json
   FIREBASE_DATABASE_URL=https://rdg-driveflow-default-rtdb.asia-southeast1.firebasedatabase.app
   ```

   Use your own project ID and URL. The project ID is on the **General** tab of Project settings.

## 4. Frontend config (browser side)

1. **Project settings → General → Your apps →** click the **`</>`** (Web) icon. Register an app named
   `RDG DriveFlow web`; Firebase Hosting is not needed.
2. Firebase shows a `firebaseConfig` block. Copy its values into `frontend/.env`:

   ```
   VITE_FIREBASE_API_KEY=        (apiKey)
   VITE_FIREBASE_AUTH_DOMAIN=    (authDomain)
   VITE_FIREBASE_PROJECT_ID=     (projectId)
   VITE_FIREBASE_DATABASE_URL=   (databaseURL, the same URL as the backend)
   VITE_FIREBASE_APP_ID=         (appId)
   ```

   These web values are not secret; they only identify the project. The rules in step 2 protect the data.

## 5. Test

```
cd backend
php artisan config:clear
php artisan rdg:firebase-check
```

Every line should say **OK**, ending with "Firebase is connected". Then restart both servers (Vite only reads
`frontend/.env` when it starts).

**Live test:** open the site as a guest, tap **Chat with us → Talk to a person** and send a message. In another
browser, log in as Admin and open **Support Chat**. The message should appear at once. In the Firebase console's
**Data** tab you'll see `support`, `support_feed` and `alerts` entries appear.

## On the live server (Hostinger or similar)

Repeat step 3 on the server: upload `service-account.json` to `backend/storage/app/firebase/` and set the same
three `FIREBASE_*` values. Put the `VITE_FIREBASE_*` values in `frontend/.env` **before** running `npm run build`.

## If the check fails

| Message | Fix |
|---|---|
| file not found | The key isn't at `backend/storage/app/firebase/service-account.json`, or the name differs. |
| key is for another project | The key and `FIREBASE_PROJECT_ID` are from different projects. |
| database not found | Wrong `FIREBASE_DATABASE_URL`; copy it again from the Data tab. |
| the key was rejected | Generate a new private key; also check that the PC's date and time are correct. |
| frontend and backend URLs differ | Make both database URLs identical. |
