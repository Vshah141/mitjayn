# Mitjayn Setup & Deployment

This repo supports two modes:

1. **Local demo mode** — no backend credentials required. It uses built-in data and the seeded demo login shown below.
2. **Supabase mode** — full Postgres/Auth/Storage/RLS behavior, Google OAuth hooks, private files, real bookings, QR-backed report issuance, and server-side file-hash verification.

## 1. Local demo mode

```bash
npm install
npm run dev
```

Open `http://localhost:3000/login`.

Demo credentials:

- Email: `demo@mitjayn.app`
- Password: `Demo123!`

The local demo supports dashboard filtering, privacy toggle, share-link rotation, public card verification, generated demo report PDFs, report-authenticity pages, lab search/favorites, branch selection, geolocation sorting, slot availability, and booking. Demo bookings are persisted in browser localStorage so they appear on the dashboard after booking.

## 2. Create the Supabase project

1. Create a free project at Supabase.
2. Open **SQL Editor** and run the entire contents of `supabase/schema.sql`.
3. Confirm these private Storage buckets exist:
   - `profile-photos`
   - `reports`
4. In **Project Settings → API**, copy:
   - Project URL
   - anon/public key
   - service-role key

The service-role key is server-only. Never prefix it with `NEXT_PUBLIC_` and never expose it to browser code.

## 3. Configure environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
LAB_STAFF_API_KEY=use-a-long-random-secret
```

`LAB_STAFF_API_KEY` protects the prototype-only lab issuance endpoint. In a production product this should be replaced with authenticated lab-staff accounts plus stronger authorization/auditing.

## 4. Seed the investor demo

After the schema is installed and `.env.local` is configured:

```bash
npm run seed:demo
```

This creates/updates:

- demo user `demo@mitjayn.app` / `Demo123!`
- profile data for Yash Adani
- 10 parent labs + 5 branch records
- favorites
- one upcoming booking
- five disease reports spanning verified, missing/not-updated, and detected states
- private PDF report files with an authenticity QR embedded directly in the PDF
- a SHA-256 fingerprint of each final issued PDF

The seed script uses `NEXT_PUBLIC_APP_URL` when encoding report QR links. Set it to your final Vercel URL and re-run the seed after deployment if you want seeded PDFs to point to production rather than localhost.

## 5. Google OAuth

In Supabase:

1. Go to **Authentication → Providers → Google**.
2. Enable Google.
3. Create OAuth credentials in Google Cloud Console.
4. Add the Supabase callback URL shown by Supabase to the Google OAuth client's authorized redirect URIs.
5. In Supabase **Authentication → URL Configuration**, set the Site URL to your app URL and add these redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback`

The app exchanges the OAuth code in `/auth/callback` and then redirects to `/dashboard`.

## 6. Verify the critical RLS rule

The most important security rule is that a normal user must never be able to modify their own diagnostic status.

1. Sign in as the seeded demo user using the normal app/anon client.
2. Read one of that user's `disease_reports` rows — SELECT should succeed.
3. Attempt to update the row's `status` using a normal authenticated client — the update must be rejected/affect zero rows.
4. Attempt to insert a new report using the normal user session — it must be rejected.

`supabase/rls-test.sql` contains sample statements. Do **not** run the verification as `service_role`, because service role intentionally bypasses RLS.

## 7. Lab report issuance endpoint

For a demo of a partner lab issuing a trusted report, send a multipart `POST` to:

`/api/lab/reports/issue`

Headers:

```text
x-lab-staff-key: <LAB_STAFF_API_KEY>
```

Multipart fields:

- `file` — PDF
- `profile_id`
- `lab_id`
- `disease_name`
- `status`
- `report_date`

The server:

1. generates a random report verification code,
2. embeds a QR pointing to `/verify-report/{verificationCode}` into the PDF,
3. hashes the final QR-stamped PDF with SHA-256,
4. uploads it to the private `reports` bucket using a random object path,
5. writes the `disease_reports` record using the service role.

Normal users never call this endpoint to self-issue results.

## 8. Public verification behavior

### Health card

`/verify/[shareToken]`

- uses a random, rotatable public token rather than the profile UUID
- calls the restricted `get_public_health_card()` RPC server-side with the service role; anonymous clients cannot execute the RPC directly
- returns only name-or-null, verified flag, disease and status
- does not expose phone, DOB, internal IDs, storage paths or report files
- respects `hide_name`

### Individual report authenticity

`/verify-report/[verificationCode]`

- identifies the report only by its random verification code
- performs public lookup server-side; anonymous clients have no direct table/RPC access
- displays issuing lab, test/disease, date and report status
- does not display full test values/report contents
- when `SUPABASE_SERVICE_ROLE_KEY` is present, downloads the current private PDF server-side and compares its SHA-256 hash with the fingerprint stored at issuance

The in-process rate limiter included here is suitable for a pitch prototype, not a high-scale security control. For production, move rate limiting to a shared store/edge provider such as Redis/Upstash or your API gateway/WAF.

## 9. Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel, create a new project from the repo.
3. Add these environment variables for Production/Preview as appropriate:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `LAB_STAFF_API_KEY`
4. Set `NEXT_PUBLIC_APP_URL` to the deployed HTTPS URL, for example `https://mitjayn-demo.vercel.app`.
5. Deploy.
6. Add the final `/auth/callback` URL to Supabase's allowed redirect URLs.
7. Re-run the seed locally with `NEXT_PUBLIC_APP_URL` set to the final production URL if you want the seeded PDF QR codes to target production.

## 10. End-to-end smoke test

Verify this exact sequence:

1. Sign up or log in.
2. Open `/dashboard` and confirm profile/report data renders.
3. Toggle **Option to hide name**.
4. Open the health-card QR/link and confirm the name is hidden while status remains visible.
5. Regenerate the share link and confirm the old link no longer resolves.
6. Open one report PDF from the dashboard and scan/click its authenticity QR.
7. Confirm the report-authenticity page displays the correct lab/test/date/status and reports a matching file hash.
8. Open `/labs`, favorite/unfavorite a lab, search, and optionally sort by current location.
9. Open a parent lab with branches, pick a branch, choose a date/time and book.
10. Return to the dashboard and confirm the booking appears.
11. Execute the RLS test and confirm the normal user cannot UPDATE or INSERT `disease_reports`.

## Secrets and source control

- Commit `.env.example`, never `.env.local`.
- Never commit the service-role key, Google client secret, `LAB_STAFF_API_KEY`, or real patient data.
- The seeded account/password is only for this prototype and should not be reused in a real deployment.

## 11. Report upload + extraction behavior

The dashboard **Add report** action accepts PDF/JPG/JPEG files. Browser uploads go directly to the private Supabase `reports` bucket under `<user-id>/uploads/`, then the authenticated server route downloads and parses the file. This avoids routing the full file body through the Vercel function.

- Text PDFs are parsed directly.
- Scanned PDFs fall back to OCR on the first two rendered pages.
- JPG/JPEG reports use OCR.
- The prototype extracts supported disease, reported result, report date, lab name, patient name, age, gender, and DOB where present.
- Extracted private profile fields are applied to the user's profile.
- User-uploaded reports are always created with `verification_state = pending`; they are not included in the public verified health card until a trusted lab flow changes them to verified.

For an existing deployment, run `supabase/migrations/20260920_mitjayn_upgrade.sql` before deploying this version. See `UPGRADE.md`.
