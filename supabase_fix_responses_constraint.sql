-- Fix for analytic_responses: restore the unique constraint the app's upsert
-- relies on. Without it, every save fails with error 42P10 and no progress
-- is ever stored. Run this in the Supabase Dashboard -> SQL Editor.

-- 1) Normalize codes (one existing row has a trailing newline in clevo_code,
--    which created a duplicate user row)
update analytic_responses
set clevo_code = trim(clevo_code),
    form_code  = trim(form_code)
where clevo_code <> trim(clevo_code)
   or form_code <> trim(form_code);

-- 2) Remove duplicate rows, keeping the most recently updated one per user+form
delete from analytic_responses a
using analytic_responses b
where a.form_code = b.form_code
  and a.clevo_code = b.clevo_code
  and (a.updated_at < b.updated_at
       or (a.updated_at = b.updated_at and a.ctid < b.ctid));

-- 3) Restore the unique constraint so upsert(onConflict: 'form_code,clevo_code') works
alter table analytic_responses
  add constraint analytic_responses_form_code_clevo_code_key
  unique (form_code, clevo_code);
