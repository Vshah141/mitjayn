# VeriHealth Prototype

Pitch-ready prototype for verified health reports, public status cards, report authenticity QR codes, partner-lab discovery, favorites, and test bookings.

## Run immediately in local demo mode

```bash
npm install
npm run dev
```

Open `http://localhost:3000/login` and use:

- Email: `demo@verihealth.app`
- Password: `Demo123!`

With no Supabase environment variables present, the app runs against built-in demo data so the product can be reviewed before any backend setup.

## Turn on the real Supabase backend

1. Copy `.env.example` to `.env.local`.
2. Create a Supabase project.
3. Run `supabase/schema.sql` in the SQL Editor.
4. Add the project URL, anon key and server-only service-role key to `.env.local`.
5. Run `npm run seed:demo` to create the investor-demo account, labs, reports, QR-backed PDFs, favorites and booking.
6. Restart `npm run dev`.

See `SETUP.md` for Supabase, Google OAuth, RLS verification and Vercel deployment.

## Important security design

- Normal users can **read but cannot write** their own `disease_reports` rows.
- Public health-card access goes through `get_public_health_card()` and never anonymous table SELECT.
- Public report authenticity goes through a restricted RPC; actual PDF hash verification is performed server-side when the service role is configured.
- Profile photos and reports are in private Storage buckets.
- Lab-issued PDFs receive a QR pointing to `/verify-report/[verificationCode]` and are SHA-256 hashed after QR embedding.
