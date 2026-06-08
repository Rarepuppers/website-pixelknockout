-- ===== PKO — Supabase schema =====
-- Run in the Supabase SQL editor. Enforces the free-points economy at the DB level:
-- points are only ever GRANTED by server functions, never bought or transferred.

-- ---------- profiles ----------
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default 'Fighter',
  name_chosen boolean not null default false,
  showcase_item_id text,
  showcase_icon text,
  showcase_title text,
  created_at timestamptz default now()
);

alter table public.profiles add column if not exists showcase_item_id text;
alter table public.profiles add column if not exists showcase_icon text;
alter table public.profiles add column if not exists showcase_title text;

-- NOTE: security-definer + `set search_path = ''` means EVERY object must be
-- schema-qualified (public.profiles). This trigger runs inside Supabase's auth
-- context, whose search_path does NOT include public — unqualified names fail
-- with: relation "profiles" does not exist (42P01).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  insert into public.profiles (id, name)
  values (new.id, split_part(coalesce(new.email,'fighter'),'@',1));
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- season points (THE leaderboard balance; one per user per season) ----------
create table if not exists season_scores (
  user_id uuid references auth.users on delete cascade,
  season int not null,
  points int not null default 0,
  signup_granted boolean not null default false,
  last_daily date,
  primary key (user_id, season)
);

-- track per-event free grants
create table if not exists event_grants (
  user_id uuid references auth.users on delete cascade,
  event_id text not null,
  primary key (user_id, event_id)
);

-- admin-configured live-event bonus windows
create table if not exists event_bonus_windows (
  bonus_id text primary key,
  event_id text not null,
  label text not null,
  amount int not null check (amount between 1 and 1000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check (ends_at > starts_at)
);

create table if not exists event_bonus_claims (
  user_id uuid references auth.users on delete cascade,
  bonus_id text references event_bonus_windows on delete cascade,
  claimed_at timestamptz default now(),
  primary key (user_id, bonus_id)
);

-- admin allowlist for manual result settlement
create table if not exists admin_emails (
  email text primary key,
  created_at timestamptz default now()
);

insert into public.admin_emails (email)
values ('info@pixelknockout.com')
on conflict (email) do nothing;

-- immutable point ledger for player profiles
create table if not exists point_history (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  season int not null,
  kind text not null,
  event_id text,
  bonus_id text,
  label text not null,
  amount int not null,
  balance int not null,
  created_at timestamptz default now()
);

-- ---------- predictions ----------
create table if not exists predictions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  event_id text not null,
  bout_id text not null,
  pick text not null check (pick in ('a','b')),
  stake int not null check (stake >= 0),
  multiplier numeric not null,
  settled boolean not null default false,
  won int not null default 0,
  result text,
  created_at timestamptz default now(),
  unique (user_id, event_id, bout_id)
);

-- official/manual bout result records entered by an admin
create table if not exists bout_results (
  event_id text not null,
  bout_id text not null,
  result text not null check (result in ('a','b','void','draw','cancelled')),
  win_type text,
  method_detail text,
  settled_count int not null default 0,
  refunded_count int not null default 0,
  settled_by uuid references auth.users,
  settled_at timestamptz default now(),
  primary key (event_id, bout_id)
);

-- ---------- trophies (virtual, zero value) ----------
create table if not exists trophies (
  id text primary key,            -- e.g. '<user>:<event>-belt'
  user_id uuid references auth.users on delete cascade,
  season int not null,
  event_id text, event_title text,
  kind text, icon text, title text, sub text,
  created_at timestamptz default now()
);

-- ---------- public leaderboard ----------
-- Drop/recreate views so older installs can accept column order/name changes.
-- CREATE OR REPLACE VIEW cannot rename existing view columns.
drop view if exists public.event_leaderboard;
drop view if exists public.leaderboard;

create or replace view leaderboard as
  select s.user_id, p.name, p.showcase_icon, p.showcase_title, s.season, s.points
  from season_scores s join profiles p on p.id = s.user_id
  where p.name_chosen = true;

-- Event-specific leaderboard. Public aggregate only; does not expose individual
-- bout picks. Updated as the server settlement job marks predictions settled.
create or replace view event_leaderboard as
  select
    pr.user_id,
    p.name,
    pr.event_id,
    count(*)::int as total_fights,
    count(*) filter (where pr.settled)::int as settled_fights,
    count(*) filter (where pr.result in ('void','draw','cancelled'))::int as voided,
    count(*) filter (where pr.settled and pr.result not in ('void','draw','cancelled') and pr.won > 0)::int as hits,
    count(*) filter (where pr.settled and pr.result not in ('void','draw','cancelled') and pr.won = 0)::int as misses,
    coalesce(sum(pr.stake), 0)::int as committed_points,
    coalesce(sum(case when pr.result in ('void','draw','cancelled') then pr.stake else pr.won end), 0)::int as returned_points,
    (coalesce(sum(case when pr.result in ('void','draw','cancelled') then pr.stake else pr.won end), 0) - coalesce(sum(pr.stake), 0))::int as event_points
  from predictions pr
  join profiles p on p.id = pr.user_id
  where p.name_chosen = true
  group by pr.user_id, p.name, pr.event_id;

-- ========== RLS ==========
alter table profiles      enable row level security;
alter table season_scores enable row level security;
alter table event_grants  enable row level security;
alter table event_bonus_windows enable row level security;
alter table event_bonus_claims  enable row level security;
alter table admin_emails enable row level security;
alter table point_history enable row level security;
alter table predictions   enable row level security;
alter table bout_results  enable row level security;
alter table trophies      enable row level security;

drop policy if exists "read profiles" on public.profiles;
drop policy if exists "set own name" on public.profiles;
drop policy if exists "read scores" on public.season_scores;
drop policy if exists "read bonus windows" on public.event_bonus_windows;
drop policy if exists "read own bonus claims" on public.event_bonus_claims;
drop policy if exists "read own point history" on public.point_history;
drop policy if exists "own preds" on public.predictions;
drop policy if exists "read bout results" on public.bout_results;
drop policy if exists "read trophies" on public.trophies;
drop policy if exists "read own trophies" on public.trophies;

create policy "read profiles"  on profiles      for select using (true);
create policy "set own name"   on profiles      for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "read scores"    on season_scores for select using (true);
create policy "read bonus windows" on event_bonus_windows for select using (true);
create policy "read own bonus claims" on event_bonus_claims for select using (auth.uid() = user_id);
create policy "read own point history" on point_history for select using (auth.uid() = user_id);
create policy "own preds"      on predictions   for select using (auth.uid() = user_id);
create policy "read bout results" on bout_results for select using (true);
create policy "read own trophies"  on trophies  for select using (auth.uid() = user_id);
-- No client INSERT/UPDATE on points/predictions/trophies: only the SECURITY
-- DEFINER functions below write points. That's what makes points unmintable.

-- ========== server-only point functions ==========
create or replace function public._ensure_season()
returns void language plpgsql security definer
set search_path = '' as $$
begin
  insert into public.season_scores (user_id, season)
  values (auth.uid(), extract(year from now())::int)
  on conflict do nothing;
end; $$;

create or replace function public.grant_signup(p_amount int)
returns void language plpgsql security definer
set search_path = '' as $$
declare new_bal int;
begin
  perform public._ensure_season();
  update public.season_scores set points = points + p_amount, signup_granted = true
   where user_id = auth.uid() and season = extract(year from now())::int and signup_granted = false
   returning points into new_bal;
  if new_bal is not null then
    insert into public.point_history (user_id, season, kind, label, amount, balance)
    values (auth.uid(), extract(year from now())::int, 'grant', 'Signup welcome grant', p_amount, new_bal);
  end if;
end; $$;

create or replace function public.grant_daily(p_amount int, p_day date)
returns void language plpgsql security definer
set search_path = '' as $$
declare new_bal int;
begin
  perform public._ensure_season();
  update public.season_scores set points = points + p_amount, last_daily = p_day
   where user_id = auth.uid() and season = extract(year from now())::int
     and (last_daily is null or last_daily < p_day)
   returning points into new_bal;
  if new_bal is not null then
    insert into public.point_history (user_id, season, kind, label, amount, balance)
    values (auth.uid(), extract(year from now())::int, 'grant', 'Daily visit grant', p_amount, new_bal);
  end if;
end; $$;

create or replace function public.grant_event_points(p_event text, p_amount int)
returns void language plpgsql security definer
set search_path = '' as $$
declare inserted int; new_bal int;
begin
  perform public._ensure_season();
  insert into public.event_grants (user_id, event_id) values (auth.uid(), p_event)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 1 then
    update public.season_scores set points = points + p_amount
     where user_id = auth.uid() and season = extract(year from now())::int
     returning points into new_bal;
    insert into public.point_history (user_id, season, kind, event_id, label, amount, balance)
    values (auth.uid(), extract(year from now())::int, 'event_grant', p_event, upper(p_event) || ' event grant', p_amount, new_bal);
  end if;
end; $$;

create or replace function public.claim_event_bonus(p_bonus_id text)
returns void language plpgsql security definer
set search_path = '' as $$
declare b public.event_bonus_windows%rowtype; inserted int; new_bal int; yr int := extract(year from now())::int;
begin
  select * into b from public.event_bonus_windows
   where bonus_id = p_bonus_id and now() between starts_at and ends_at;
  if b.bonus_id is null then raise exception 'That bonus is not available right now'; end if;

  perform public._ensure_season();
  insert into public.event_bonus_claims (user_id, bonus_id) values (auth.uid(), p_bonus_id)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted <> 1 then raise exception 'Bonus already claimed'; end if;

  update public.season_scores set points = points + b.amount
   where user_id = auth.uid() and season = yr
   returning points into new_bal;
  insert into public.point_history (user_id, season, kind, event_id, bonus_id, label, amount, balance)
  values (auth.uid(), yr, 'event_bonus', b.event_id, b.bonus_id, b.label, b.amount, new_bal);
end; $$;

create or replace function public.submit_predictions(p_event text, p_picks jsonb)
returns void language plpgsql security definer
set search_path = '' as $$
declare item jsonb; total int := 0; bal int; new_bal int; yr int := extract(year from now())::int;
begin
  if exists (select 1 from public.predictions where user_id = auth.uid() and event_id = p_event) then
    raise exception 'Predictions already locked';
  end if;

  for item in select * from jsonb_array_elements(p_picks) loop
    if (item->>'stake')::int <= 0 then raise exception 'Stake must be positive'; end if;
    total := total + (item->>'stake')::int;
  end loop;
  select points into bal from public.season_scores where user_id = auth.uid() and season = yr;
  if bal is null or total > bal then raise exception 'Not enough Glory Points'; end if;
  for item in select * from jsonb_array_elements(p_picks) loop
    insert into public.predictions (user_id, event_id, bout_id, pick, stake, multiplier)
    values (auth.uid(), p_event, item->>'boutId', item->>'pick', (item->>'stake')::int, (item->>'multiplier')::numeric)
    on conflict (user_id, event_id, bout_id) do nothing;
  end loop;
  update public.season_scores set points = points - total where user_id = auth.uid() and season = yr
  returning points into new_bal;
  insert into public.point_history (user_id, season, kind, event_id, label, amount, balance)
  values (auth.uid(), yr, 'prediction_stake', p_event, 'Locked predictions for ' || upper(p_event), -total, new_bal);
end; $$;

create or replace function public._is_admin()
returns boolean language sql security definer
set search_path = '' as $$
  select exists (
    select 1
    from public.admin_emails a
    where lower(a.email) = lower(coalesce(auth.jwt()->>'email', ''))
  );
$$;

create or replace function public.admin_settle_bout(
  p_event text,
  p_bout text,
  p_result text,
  p_win_type text default null,
  p_method_detail text default null
)
returns table(settled_count int, refunded_count int, win_count int, loss_count int)
language plpgsql security definer
set search_path = '' as $$
declare
  rec public.predictions%rowtype;
  yr int := extract(year from now())::int;
  movement int;
  new_bal int;
  kind text;
  label text;
  settled_total int := 0;
  refunded_total int := 0;
  wins_total int := 0;
  losses_total int := 0;
begin
  if not public._is_admin() then
    raise exception 'Admin access required';
  end if;
  if p_result is null or p_result not in ('a','b','void','draw','cancelled') then
    raise exception 'Invalid result';
  end if;
  if exists (select 1 from public.bout_results where event_id = p_event and bout_id = p_bout) then
    raise exception 'That bout has already been settled';
  end if;

  for rec in
    select * from public.predictions
    where event_id = p_event and bout_id = p_bout and settled = false
    for update
  loop
    settled_total := settled_total + 1;

    if p_result in ('void','draw','cancelled') then
      movement := rec.stake;
      kind := 'prediction_refund';
      label := upper(p_event) || ' ' || p_bout || ' refund';
      refunded_total := refunded_total + 1;
      update public.season_scores
         set points = points + movement
       where user_id = rec.user_id and season = yr
       returning points into new_bal;
    elsif rec.pick = p_result then
      movement := round(rec.stake * rec.multiplier)::int;
      kind := 'prediction_win';
      label := upper(p_event) || ' ' || p_bout || ' prediction win';
      wins_total := wins_total + 1;
      update public.season_scores
         set points = points + movement
       where user_id = rec.user_id and season = yr
       returning points into new_bal;
    else
      movement := 0;
      kind := 'prediction_loss';
      label := upper(p_event) || ' ' || p_bout || ' prediction missed';
      losses_total := losses_total + 1;
      select points into new_bal
        from public.season_scores
       where user_id = rec.user_id and season = yr;
    end if;

    update public.predictions
       set settled = true,
           result = p_result,
           won = case when p_result in ('a','b') and rec.pick = p_result then movement else 0 end
     where id = rec.id;

    insert into public.point_history (user_id, season, kind, event_id, label, amount, balance)
    values (rec.user_id, yr, kind, p_event, label, movement, coalesce(new_bal, 0));
  end loop;

  insert into public.bout_results (
    event_id, bout_id, result, win_type, method_detail,
    settled_count, refunded_count, settled_by, settled_at
  )
  values (
    p_event, p_bout, p_result, nullif(trim(coalesce(p_win_type, '')), ''),
    nullif(trim(coalesce(p_method_detail, '')), ''), settled_total,
    refunded_total, auth.uid(), now()
  );

  settled_count := settled_total;
  refunded_count := refunded_total;
  win_count := wins_total;
  loss_count := losses_total;
  return next;
end; $$;

-- Current configured live-event bonuses. Keep this aligned with `js/data.js`.
insert into public.event_bonus_windows (bonus_id, event_id, label, amount, starts_at, ends_at)
values
  ('ufc-329-live-checkin', 'ufc-329', 'Live event check-in', 329, '2026-07-11T19:00:00-07:00', '2026-07-11T23:00:00-07:00'),
  ('ufc-329-main-event', 'ufc-329', 'Main event bonus', 200, '2026-07-11T22:35:00-07:00', '2026-07-11T23:00:00-07:00')
on conflict (bonus_id) do update set
  event_id = excluded.event_id,
  label = excluded.label,
  amount = excluded.amount,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at;

-- Settlement + belt awards run SERVER-SIDE (cron / Edge Function) after the real
-- results are known: for each prediction, if pick = real winner, add stake*multiplier
-- to season_scores.points; once the card is final, rank the season leaderboard and
-- insert top-5 belt trophies + participation badges. Never expose to clients.
-- Trophy inventory should include:
--   kind='badge' title='Gold/Silver/Bronze/Copper/Iron Event Badge' for event ranks 1-5
--   kind='belt'  title='<Division> Belt' for the highest event score in each division
-- Players can select one owned trophy/member badge as profiles.showcase_*; these are
-- virtual items only and cannot be bought, sold, transferred, traded, or cashed out.
-- Also insert one point_history row per settlement movement:
--   prediction_win    amount = stake*multiplier, balance = new score
--   prediction_loss   amount = 0, balance = current score
--   prediction_refund amount = stake, balance = new score
--
-- VOIDED BOUTS: if a real fight is scratched (cancelled, weight miss, pulled),
-- mark predictions for that bout result='void', refund the held stake
-- (season_scores.points += stake), and EXCLUDE them from the win/loss record.
-- A voided pick is neither a hit nor a miss.
