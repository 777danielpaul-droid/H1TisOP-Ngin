-- H!TisOP: Bestenliste (ein Bestwert je Spieler). Lesen darf jeder, Schreiben nur über submit_highscore() (nimmt die Spieler-ID aus dem Login, nie vom Client).
-- Idempotent: beliebig oft ausfuehrbar. Hinweis: Die Punkte kommen vom Spiel im Browser und lassen sich nicht serverseitig nachrechnen (Gelegenheits-Bestenliste); die Obergrenzen unten begrenzen Missbrauch.

create table if not exists public.highscores (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 16),
  score      integer not null check (score between 0 and 500000),
  fighter    text not null check (fighter ~ '^[A-Za-z0-9_]{1,24}$'),
  stages     smallint not null default 0 check (stages between 0 and 40),
  diff       smallint not null default 0 check (diff between 0 and 9),
  win        boolean not null default false,
  hits       integer not null default 0 check (hits between 0 and 99999),
  taken      integer not null default 0 check (taken between 0 and 99999),
  max_combo  integer not null default 0 check (max_combo between 0 and 999),
  updated_at timestamptz not null default now()
);
create index if not exists highscores_score_idx on public.highscores (score desc);

alter table public.highscores enable row level security;
drop policy if exists "highscores_read_all" on public.highscores;
create policy "highscores_read_all" on public.highscores for select to anon, authenticated using (true);

-- keine direkten Schreibzugriffe (nur die Funktion unten)
revoke all on public.highscores from anon, authenticated;
grant select on public.highscores to anon, authenticated;

create or replace function public.submit_highscore(
  p_name text, p_score integer, p_fighter text, p_stages integer, p_diff integer, p_win boolean,
  p_hits integer, p_taken integer, p_max_combo integer
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  nm  text;
  sc  integer;
  fi  text;
  rk  integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  nm := btrim(left(regexp_replace(coalesce(p_name, ''), '[^A-Za-z0-9 äöüÄÖÜß_.-]', '', 'g'), 16));
  if char_length(nm) < 1 then nm := 'SPIELER'; end if;
  sc := least(greatest(coalesce(p_score, 0), 0), 500000);
  fi := case when coalesce(p_fighter, '') ~ '^[A-Za-z0-9_]{1,24}$' then p_fighter else 'unknown' end;

  insert into public.highscores as h (user_id, name, score, fighter, stages, diff, win, hits, taken, max_combo)
  values (uid, nm, sc, fi,
          least(greatest(coalesce(p_stages, 0), 0), 40), least(greatest(coalesce(p_diff, 0), 0), 9), coalesce(p_win, false),
          least(greatest(coalesce(p_hits, 0), 0), 99999), least(greatest(coalesce(p_taken, 0), 0), 99999), least(greatest(coalesce(p_max_combo, 0), 0), 999))
  on conflict (user_id) do update
    set name = excluded.name, updated_at = now()
  where h.score >= excluded.score;                       -- schlechterer Lauf: nur den Namen aktualisieren
  update public.highscores as h
     set score = sc, fighter = fi, stages = least(greatest(coalesce(p_stages, 0), 0), 40), diff = least(greatest(coalesce(p_diff, 0), 0), 9),
         win = coalesce(p_win, false), hits = least(greatest(coalesce(p_hits, 0), 0), 99999), taken = least(greatest(coalesce(p_taken, 0), 0), 99999),
         max_combo = least(greatest(coalesce(p_max_combo, 0), 0), 999), name = nm, updated_at = now()
   where h.user_id = uid and h.score < sc;               -- neuer Bestwert

  select count(*) + 1 into rk from public.highscores h where h.score > (select score from public.highscores where user_id = uid);
  return rk;
end;
$$;

revoke all on function public.submit_highscore(text, integer, text, integer, integer, boolean, integer, integer, integer) from public, anon;
grant execute on function public.submit_highscore(text, integer, text, integer, integer, boolean, integer, integer, integer) to authenticated;
