-- Apply in the Supabase SQL editor. No service-role key belongs in the browser.
create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 300),
  profile jsonb not null check (jsonb_typeof(profile)='object'),
  prediction jsonb not null check (jsonb_typeof(prediction)='object'),
  created_at timestamptz not null default now()
);
create index predictions_owner_date on public.predictions(user_id,created_at desc);
alter table public.predictions enable row level security;
revoke all on public.predictions from anon;
grant select,insert,delete on public.predictions to authenticated;
create policy read_own on public.predictions for select to authenticated using ((select auth.uid())=user_id);
create policy save_own on public.predictions for insert to authenticated with check ((select auth.uid())=user_id);
create policy delete_own on public.predictions for delete to authenticated using ((select auth.uid())=user_id);
