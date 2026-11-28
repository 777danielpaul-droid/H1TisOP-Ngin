-- H!TisOP: Cloud-Spielstand (eine Zeile pro Spieler). Idempotent: beliebig oft ausfuehrbar.
create table if not exists public.savegames (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint savegames_data_is_object check (jsonb_typeof(data) = 'object'),
  constraint savegames_data_max_size  check (pg_column_size(data) < 262144)
);

-- updated_at immer vom Server setzen
create or replace function public.savegames_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists savegames_touch on public.savegames;
create trigger savegames_touch before update on public.savegames
  for each row execute function public.savegames_touch();

-- Row Level Security: jeder sieht und aendert nur seine eigene Zeile
alter table public.savegames enable row level security;

drop policy if exists "savegames_select_own" on public.savegames;
create policy "savegames_select_own" on public.savegames
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "savegames_insert_own" on public.savegames;
create policy "savegames_insert_own" on public.savegames
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "savegames_update_own" on public.savegames;
create policy "savegames_update_own" on public.savegames
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "savegames_delete_own" on public.savegames;
create policy "savegames_delete_own" on public.savegames
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.savegames from anon;
grant select, insert, update, delete on public.savegames to authenticated;
