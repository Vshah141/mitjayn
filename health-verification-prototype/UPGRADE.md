# Mitjayn upgrade: report uploads, notifications, rebrand, Yash seed

This upgrade is designed for the already-deployed Supabase + Vercel prototype.

## What changed

- `Add report` now opens an upload dialog for PDF/JPG/JPEG reports.
- Files upload directly from the browser to the private Supabase `reports` bucket, then a server route extracts/reads the document.
- Text PDFs are parsed directly; JPG/scanned PDF fallback uses OCR.
- Extracted disease/result/date/lab data is added to the dashboard.
- Extracted name/age/gender/DOB updates the private profile automatically.
- User-uploaded reports are marked `pending` and do not become trusted health-card verification until the trusted lab flow verifies them.
- Bell opens a right-side notification panel grouped into Bookings, Reports, and Profile changes.
- Database triggers create notifications for bookings, report additions/verification changes, and profile updates.
- Brand is now Mitjayn.
- Demo user is now `Yash Adani`, Male, age 30. The seed migrates the old `demo@verihealth.app` auth account to `demo@mitjayn.app` when present.

## Required order for an existing deployment

### 1. Update local code and install dependencies

```bash
npm install
npm run build
```

Node 20+ is required by the PDF extraction package.

### 2. Run the database migration BEFORE deploying the new app

Open Supabase → SQL Editor and run:

`supabase/migrations/20260920_mitjayn_upgrade.sql`

This adds:

- report source + verification-state columns
- extracted report metadata
- `notifications`
- notification RLS and triggers
- safe upload/delete policies for `<user-id>/uploads/*`
- public verification filters so pending user uploads never count as verified

### 3. Update the demo account/data

Run the seed using the same `.env.local` you already use:

```bash
node --env-file=.env.local scripts/seed-demo.mjs
```

This will reuse/migrate the old demo auth user where possible, then seed Yash Adani and regenerate the trusted demo reports.

### 4. Smoke test locally

```bash
npm run dev
```

Test:

1. Login with `demo@mitjayn.app` / `Demo123!`.
2. Click **Add report**.
3. Upload a PDF/JPG containing one of: Covid-19, Monkeypox/Mpox, Dengue, Malaria, Swine Flu/H1N1.
4. Confirm the report appears as **Pending verification**.
5. Confirm extracted name/age/gender/DOB updates the profile when present.
6. Open the bell and confirm report/profile notifications appear.
7. Book a lab appointment and confirm a booking notification is created.
8. Open the public health card and confirm the newly uploaded pending report does not count as a verified result.

### 5. Commit and push

```bash
git status
git add .
git commit -m "feat: add Mitjayn report uploads and notifications"
git push origin main
```

If you use feature branches instead:

```bash
git checkout -b feat/mitjayn-report-upload-notifications
git add .
git commit -m "feat: add Mitjayn report uploads and notifications"
git push -u origin feat/mitjayn-report-upload-notifications
```

Merge the PR into `main` afterward.

### 6. Vercel redeploy

If Vercel is connected to the GitHub repository and Production tracks `main`, pushing/merging into `main` automatically creates a new production deployment.

No new environment variables are required. Keep the existing values for:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `LAB_STAFF_API_KEY`

After deployment, open Vercel → Deployments and make sure the latest commit is marked **Production** and **Ready**.
