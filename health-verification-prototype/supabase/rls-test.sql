-- Manual RLS smoke test for the single most important rule.
-- Run as a normal signed-in user via the app/client, not as service_role.
-- Replace REPORT_ID with one of that user's own report IDs.

-- This SELECT should succeed:
select id, disease_name, status from public.disease_reports where id = 'REPORT_ID';

-- This UPDATE MUST affect 0 rows / be rejected by RLS for a normal user:
update public.disease_reports
set status = 'verified_negative'
where id = 'REPORT_ID';

-- A normal user must also fail to insert a self-issued report:
insert into public.disease_reports(profile_id, disease_name, status, report_date)
values (auth.uid(), 'Covid-19', 'verified_negative', current_date);
