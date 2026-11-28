-- H!TisOP: Bestenliste (ein Bestwert je Spieler), serverseitig geprüft.
-- Lesen darf jeder. Schreiben NUR über submit_highscore(): der Client schickt keine Punktzahl, sondern das Stage-Protokoll; die Funktion rechnet die Punkte selbst aus
-- (gleiche Formel wie src/core/score.js, JS-Zwilling verifyRun) und lehnt Unmögliches ab. Spieler-ID kommt aus dem Login. Idempotent: beliebig oft ausführbar.

-- Vorgänger (nahm eine fertige Punktzahl an) entfernen, falls schon eingespielt
drop function if exists public.submit_highscore(text, integer, text, integer, integer, boolean, integer, integer, integer);

create table if not exists public.highscores (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 16),
  score        integer not null check (score between 0 and 500000),
  fighter      text not null check (fighter ~ '^[A-Za-z0-9_]{1,24}$'),
  stages       smallint not null default 0 check (stages between 0 and 20),
  diff         smallint not null default 0 check (diff between 0 and 9),
  win          boolean not null default false,
  hits         integer not null default 0 check (hits between 0 and 99999),
  taken        integer not null default 0 check (taken between 0 and 99999),
  max_combo    integer not null default 0 check (max_combo between 0 and 999),
  updated_at   timestamptz not null default now(),
  submitted_at timestamptz not null default now()
);
create index if not exists highscores_score_idx on public.highscores (score desc);

alter table public.highscores enable row level security;
drop policy if exists "highscores_read_all" on public.highscores;
create policy "highscores_read_all" on public.highscores for select to anon, authenticated using (true);

revoke all on public.highscores from anon, authenticated;
grant select (name, score, fighter, stages, diff, win, hits, taken, max_combo, updated_at) on public.highscores to anon, authenticated;

-- p_log: Array je Stage: [gewonnen, Treffer, eingesteckt, laengste Combo, perfekte Runden, Restleben (1/100 je Runde), Restzeit (s), gespielte Runden, Endgegner]
create or replace function public.submit_highscore(p_name text, p_fighter text, p_diff integer, p_log jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Punkteformel (muss zu SCORE in src/core/score.js passen)
  c_hit constant integer := 100;   c_combo_step constant integer := 150;  c_combo_max constant integer := 10;
  c_taken constant integer := 75;  c_clear constant integer := 1000;      c_perfect constant integer := 500;
  c_flawless constant integer := 2000;  c_hp constant integer := 300;     c_time constant integer := 10;
  c_cap constant integer := 500000;
  -- Obergrenzen (LIMITS in src/core/score.js)
  l_hits constant integer := 60;   l_taken constant integer := 60;   l_combo constant integer := 25;
  l_min_rounds constant integer := 2;  l_max_rounds constant integer := 9;  l_win_rounds constant integer := 2;
  l_sec constant integer := 99;    l_stages constant integer := 20;  l_gap constant integer := 20;
  uid uuid := auth.uid();
  nm text; fi text; d integer; n integer; i integer; r jsonb; j integer;
  w integer; h integer; t integer; c integer; p integer; hpc integer; tm integer; rd integer; bs integer; wr integer;
  sub numeric; stage_total numeric;
  total integer := 0; n_won integer := 0; hits_sum integer := 0; taken_sum integer := 0; combo_max integer := 0; last_won integer := 0;
  prev timestamptz; rk integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  d := least(greatest(coalesce(p_diff, 0), 0), 9);
  if p_log is null or jsonb_typeof(p_log) <> 'array' then raise exception 'invalid_run: log' using errcode = 'P0001'; end if;
  n := jsonb_array_length(p_log);
  if n < 1 or n > l_stages then raise exception 'invalid_run: length' using errcode = 'P0001'; end if;

  for i in 0 .. n - 1 loop
    r := p_log -> i;
    if jsonb_typeof(r) <> 'array' or jsonb_array_length(r) <> 9 then raise exception 'invalid_run: row %', i using errcode = 'P0001'; end if;
    for j in 0 .. 8 loop
      if jsonb_typeof(r -> j) <> 'number' or (r ->> j) !~ '^[0-9]{1,7}$' then raise exception 'invalid_run: value %', i using errcode = 'P0001'; end if;
    end loop;
    w := (r ->> 0)::integer;  h := (r ->> 1)::integer;  t := (r ->> 2)::integer;  c := (r ->> 3)::integer;  p := (r ->> 4)::integer;
    hpc := (r ->> 5)::integer; tm := (r ->> 6)::integer; rd := (r ->> 7)::integer; bs := (r ->> 8)::integer;
    wr := case when w = 1 then l_win_rounds else l_win_rounds - 1 end;
    if w > 1 or bs > 1 then raise exception 'invalid_run: flag' using errcode = 'P0001'; end if;
    if w = 0 and i < n - 1 then raise exception 'invalid_run: loss only at the end' using errcode = 'P0001'; end if;
    if bs = 1 and i < n - 1 then raise exception 'invalid_run: boss only at the end' using errcode = 'P0001'; end if;
    if rd < l_min_rounds or rd > l_max_rounds or (w = 1 and rd < l_win_rounds) then raise exception 'invalid_run: rounds' using errcode = 'P0001'; end if;
    if h > l_hits * rd or t > l_taken * rd then raise exception 'invalid_run: hits' using errcode = 'P0001'; end if;
    if c > least(h, l_combo) or (h > 0 and c < 1) then raise exception 'invalid_run: combo' using errcode = 'P0001'; end if;
    if p > wr or (w = 1 and p < greatest(0, l_win_rounds - t)) then raise exception 'invalid_run: perfect' using errcode = 'P0001'; end if;
    if hpc > 100 * wr or tm > l_sec * wr then raise exception 'invalid_run: hp/time' using errcode = 'P0001'; end if;

    sub := h * c_hit
         + case when c >= 2 then (least(c, c_combo_max) - 1) * c_combo_step else 0 end
         + case when w = 1 then c_clear + p * c_perfect + case when t = 0 then c_flawless else 0 end + hpc * c_hp / 100 + tm * c_time else 0 end
         - t * c_taken;
    sub := greatest(0, sub);
    stage_total := round(sub * (1 + 0.25 * d) * case when bs = 1 then 1.5 else 1 end);
    total := least(c_cap, total + least(c_cap, stage_total::integer));
    if w = 1 then n_won := n_won + 1; end if;
    hits_sum := least(99999, hits_sum + h);  taken_sum := least(99999, taken_sum + t);  combo_max := greatest(combo_max, c);  last_won := w;
  end loop;

  nm := btrim(left(regexp_replace(coalesce(p_name, ''), '[^A-Za-z0-9 äöüÄÖÜß_.-]', '', 'g'), 16));
  if char_length(nm) < 1 then nm := 'SPIELER'; end if;
  fi := case when coalesce(p_fighter, '') ~ '^[A-Za-z0-9_]{1,24}$' then p_fighter else 'unknown' end;

  select submitted_at into prev from public.highscores where user_id = uid;
  if prev is not null and prev > now() - make_interval(secs => l_gap) then
    raise exception 'invalid_run: too fast' using errcode = 'P0001';
  end if;

  insert into public.highscores as hs (user_id, name, score, fighter, stages, diff, win, hits, taken, max_combo)
  values (uid, nm, total, fi, n_won, d, last_won = 1, hits_sum, taken_sum, combo_max)
  on conflict (user_id) do update
    set name = excluded.name, submitted_at = now(), updated_at = now()
  where hs.score >= excluded.score;                          -- nicht besser: nur Name/Zeitpunkt aktualisieren
  update public.highscores as hs
     set score = total, fighter = fi, stages = least(n_won, 20), diff = d, win = (last_won = 1), hits = hits_sum, taken = taken_sum, max_combo = combo_max,
         name = nm, updated_at = now(), submitted_at = now()
   where hs.user_id = uid and hs.score < total;               -- neuer Bestwert

  select count(*) + 1 into rk from public.highscores x where x.score > (select y.score from public.highscores y where y.user_id = uid);
  return jsonb_build_object('score', total, 'rank', rk);
end;
$$;

revoke all on function public.submit_highscore(text, text, integer, jsonb) from public, anon;
grant execute on function public.submit_highscore(text, text, integer, jsonb) to authenticated;

-- Spielername ändern (ohne neuen Lauf)
create or replace function public.set_highscore_name(p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  nm text;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  nm := btrim(left(regexp_replace(coalesce(p_name, ''), '[^A-Za-z0-9 äöüÄÖÜß_.-]', '', 'g'), 16));
  if char_length(nm) < 1 then nm := 'SPIELER'; end if;
  update public.highscores set name = nm, updated_at = now() where user_id = uid;
end;
$$;

revoke all on function public.set_highscore_name(text) from public, anon;
grant execute on function public.set_highscore_name(text) to authenticated;
