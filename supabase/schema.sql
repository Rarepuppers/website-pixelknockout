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
  description text,
  amount int not null check (amount between 1 and 1000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check (ends_at > starts_at)
);
alter table public.event_bonus_windows add column if not exists description text;

create table if not exists event_bonus_claims (
  user_id uuid references auth.users on delete cascade,
  bonus_id text references event_bonus_windows on delete cascade,
  claimed_at timestamptz default now(),
  primary key (user_id, bonus_id)
);

-- authoritative event/bout config used by server-side prediction validation.
-- Static JS can render cards, but the RPC below trusts this table for lock time,
-- playable status, valid picks, and multiplier values.
create table if not exists events (
  event_id text primary key,
  title text not null,
  short_title text not null,
  season int not null,
  lock_time timestamptz not null,
  starts_at timestamptz,
  ends_at timestamptz,
  -- display + lifecycle fields so the frontend can build the whole card from the
  -- DB (no redeploy needed to roll to the next event):
  --   upcoming -> shown as next card / in the schedule
  --   live     -> forced as the current card (overrides date-based pick)
  --   settled  -> card is over, results final, still viewable until archived
  --   archived -> hidden from current/upcoming selection
  status text not null default 'upcoming'
    check (status in ('upcoming','live','settled','archived')),
  real_title text,
  date_text text,
  venue text,
  location text
);

-- backfill columns for installs created before the display/lifecycle fields existed
alter table public.events add column if not exists status text not null default 'upcoming';
alter table public.events add column if not exists real_title text;
alter table public.events add column if not exists date_text text;
alter table public.events add column if not exists venue text;
alter table public.events add column if not exists location text;
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_status_check'
  ) then
    alter table public.events
      add constraint events_status_check
      check (status in ('upcoming','live','settled','archived'));
  end if;
end $$;

create table if not exists event_bouts (
  event_id text references events on delete cascade,
  bout_id text not null,
  card_section text not null default 'main' check (card_section in ('main','undercard','prelims','earlyPrelims')),
  playable boolean not null default true,
  weight text not null,
  side_a text not null,
  side_b text not null,
  odds_a int not null,
  odds_b int not null,
  primary key (event_id, bout_id)
);

-- admin allowlist for manual result settlement
create table if not exists admin_emails (
  email text primary key,
  created_at timestamptz default now()
);

insert into public.admin_emails (email)
values ('info@pixelknockout.com')
on conflict (email) do nothing;

-- audit trail for every admin mutation. Admin tools should never update player
-- state without inserting a row here in the same transaction.
create table if not exists admin_audit_log (
  id bigint generated always as identity primary key,
  admin_user_id uuid references auth.users,
  admin_email text,
  target_user_id uuid references auth.users on delete set null,
  action text not null,
  reason text not null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz default now()
);

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
  join event_bouts b on b.event_id = pr.event_id and b.bout_id = pr.bout_id
  join profiles p on p.id = pr.user_id
  where p.name_chosen = true
    and b.playable = true
    and b.card_section = 'main'
  group by pr.user_id, p.name, pr.event_id;

-- ---------- current / upcoming event selection ----------
-- The frontend reads the whole active card from here so events can be rolled
-- forward by editing the `events`/`event_bouts` tables (or the admin tools)
-- instead of redeploying JavaScript.
drop view if exists public.current_event;
drop view if exists public.upcoming_events;

-- One row: the card players should see right now. A `live` event wins; then the
-- still-open event closest to now; then the most recently completed card (so the
-- Play view keeps showing final results until the next event is added).
create or replace view current_event as
  select *
  from public.events
  where status <> 'archived'
  order by
    (status = 'live') desc,
    (lock_time >= now()) desc,
    abs(extract(epoch from (lock_time - now()))) asc
  limit 1;

-- Future cards for the Events/schedule page (admin-curated, never fabricated).
create or replace view upcoming_events as
  select *
  from public.events
  where status in ('upcoming','live')
    and lock_time >= now()
  order by lock_time asc;

-- ========== RLS ==========
alter table profiles      enable row level security;
alter table season_scores enable row level security;
alter table event_grants  enable row level security;
alter table event_bonus_windows enable row level security;
alter table event_bonus_claims  enable row level security;
alter table events enable row level security;
alter table event_bouts enable row level security;
alter table admin_emails enable row level security;
alter table admin_audit_log enable row level security;
alter table point_history enable row level security;
alter table predictions   enable row level security;
alter table bout_results  enable row level security;
alter table trophies      enable row level security;

drop policy if exists "read profiles" on public.profiles;
drop policy if exists "set own name" on public.profiles;
drop policy if exists "read scores" on public.season_scores;
drop policy if exists "read bonus windows" on public.event_bonus_windows;
drop policy if exists "read own bonus claims" on public.event_bonus_claims;
drop policy if exists "read events" on public.events;
drop policy if exists "read event bouts" on public.event_bouts;
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
create policy "read events" on events for select using (true);
create policy "read event bouts" on event_bouts for select using (true);
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

create or replace function public._american_multiplier(p_odds int)
returns numeric language sql immutable
set search_path = '' as $$
  select case when p_odds < 0
    then 1 + (100::numeric / abs(p_odds)::numeric)
    else 1 + (p_odds::numeric / 100::numeric)
  end;
$$;

create or replace function public.submit_predictions(p_event text, p_picks jsonb)
returns void language plpgsql security definer
set search_path = '' as $$
declare
  item jsonb;
  total int := 0;
  bal int;
  new_bal int;
  yr int := extract(year from now())::int;
  ev public.events%rowtype;
  bout public.event_bouts%rowtype;
  pick_side text;
  stake_amount int;
  locked_multiplier numeric;
begin
  select * into ev from public.events where event_id = p_event;
  if ev.event_id is null then raise exception 'Event is not configured'; end if;
  if now() >= ev.lock_time then raise exception 'Predictions are closed for this event'; end if;
  if exists (select 1 from public.predictions where user_id = auth.uid() and event_id = p_event) then
    raise exception 'Predictions already locked';
  end if;
  if jsonb_array_length(coalesce(p_picks, '[]'::jsonb)) = 0 then
    raise exception 'Pick at least one playable main-card matchup';
  end if;
  if (
    select count(*) from jsonb_array_elements(p_picks)
  ) <> (
    select count(distinct item->>'boutId') from jsonb_array_elements(p_picks) as x(item)
  ) then
    raise exception 'Duplicate bout picks are not allowed';
  end if;

  for item in select * from jsonb_array_elements(p_picks) loop
    pick_side := item->>'pick';
    stake_amount := (item->>'stake')::int;
    if pick_side not in ('a','b') then raise exception 'Choose a valid fighter side'; end if;
    if stake_amount <= 0 then raise exception 'Stake must be positive'; end if;

    select * into bout
      from public.event_bouts
      where event_id = p_event and bout_id = item->>'boutId';
    if bout.bout_id is null then raise exception 'Bout is not configured for this event'; end if;
    if not bout.playable or bout.card_section <> 'main' then
      raise exception 'Only selected main-card matchups are playable';
    end if;

    total := total + stake_amount;
  end loop;

  select points into bal from public.season_scores where user_id = auth.uid() and season = yr;
  if bal is null or total > bal then raise exception 'Not enough Glory Points'; end if;

  for item in select * from jsonb_array_elements(p_picks) loop
    select * into bout
      from public.event_bouts
      where event_id = p_event and bout_id = item->>'boutId';
    if bout.playable and bout.card_section = 'main' then
      pick_side := item->>'pick';
      stake_amount := (item->>'stake')::int;
      locked_multiplier := public._american_multiplier(case when pick_side = 'a' then bout.odds_a else bout.odds_b end);

      insert into public.predictions (user_id, event_id, bout_id, pick, stake, multiplier)
      values (auth.uid(), p_event, bout.bout_id, pick_side, stake_amount, locked_multiplier)
      on conflict (user_id, event_id, bout_id) do nothing;
    end if;
  end loop;

  update public.season_scores set points = points - total where user_id = auth.uid() and season = yr
  returning points into new_bal;
  insert into public.point_history (user_id, season, kind, event_id, label, amount, balance)
  values (auth.uid(), yr, 'prediction_stake', p_event, 'Locked main-card predictions for ' || upper(p_event), -total, new_bal);
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

create or replace function public._admin_require_reason(p_reason text)
returns text language plpgsql security definer
set search_path = '' as $$
declare cleaned text := btrim(coalesce(p_reason, ''));
begin
  if length(cleaned) < 4 then
    raise exception 'Admin changes require a clear reason';
  end if;
  return cleaned;
end; $$;

create or replace function public._admin_log(
  p_target uuid,
  p_action text,
  p_reason text,
  p_before jsonb,
  p_after jsonb
)
returns void language plpgsql security definer
set search_path = '' as $$
begin
  if not public._is_admin() then raise exception 'Admin access required'; end if;
  insert into public.admin_audit_log (
    admin_user_id, admin_email, target_user_id, action, reason, before_state, after_state
  )
  values (
    auth.uid(),
    coalesce(auth.jwt()->>'email', ''),
    p_target,
    p_action,
    p_reason,
    p_before,
    p_after
  );
end; $$;

create or replace function public.admin_find_players(p_query text default '', p_limit int default 25)
returns table(
  user_id uuid,
  email text,
  name text,
  name_chosen boolean,
  points int,
  showcase_item_id text,
  showcase_icon text,
  showcase_title text,
  created_at timestamptz
)
language plpgsql security definer
set search_path = '' as $$
declare q text := '%' || lower(btrim(coalesce(p_query, ''))) || '%';
begin
  if not public._is_admin() then raise exception 'Admin access required'; end if;
  return query
    select
      p.id,
      coalesce(u.email::text, ''),
      p.name,
      p.name_chosen,
      coalesce(s.points, 0)::int,
      p.showcase_item_id,
      p.showcase_icon,
      p.showcase_title,
      p.created_at
    from public.profiles p
    left join auth.users u on u.id = p.id
    left join public.season_scores s
      on s.user_id = p.id and s.season = extract(year from now())::int
    where btrim(coalesce(p_query, '')) = ''
       or lower(p.name) like q
       or lower(coalesce(u.email::text, '')) like q
       or p.id::text = btrim(coalesce(p_query, ''))
    order by p.created_at desc
    limit greatest(1, least(coalesce(p_limit, 25), 100));
end; $$;

create or replace function public.admin_update_player_name(
  p_user uuid,
  p_name text,
  p_name_chosen boolean default true,
  p_reason text default null
)
returns table(user_id uuid, name text, name_chosen boolean)
language plpgsql security definer
set search_path = '' as $$
declare
  cleaned_name text := btrim(coalesce(p_name, ''));
  cleaned_reason text;
  before_row jsonb;
  after_row jsonb;
begin
  if not public._is_admin() then raise exception 'Admin access required'; end if;
  cleaned_reason := public._admin_require_reason(p_reason);
  if length(cleaned_name) < 3 or length(cleaned_name) > 18 then
    raise exception 'Name must be 3 to 18 characters';
  end if;
  if cleaned_name !~ '^[A-Za-z0-9 _-]+$' then
    raise exception 'Name may only use letters, numbers, spaces, - and _';
  end if;

  select to_jsonb(p) into before_row from public.profiles p where p.id = p_user;
  if before_row is null then raise exception 'Player not found'; end if;

  update public.profiles
     set name = cleaned_name,
         name_chosen = coalesce(p_name_chosen, true)
   where id = p_user;

  select to_jsonb(p) into after_row from public.profiles p where p.id = p_user;

  perform public._admin_log(p_user, 'profile_name_update', cleaned_reason, before_row, after_row);
  return query select p.id, p.name, p.name_chosen from public.profiles p where p.id = p_user;
end; $$;

create or replace function public.admin_adjust_points(
  p_user uuid,
  p_amount int,
  p_reason text,
  p_label text default 'Admin point adjustment'
)
returns table(user_id uuid, points int)
language plpgsql security definer
set search_path = '' as $$
declare
  yr int := extract(year from now())::int;
  cleaned_reason text;
  cleaned_label text := btrim(coalesce(p_label, 'Admin point adjustment'));
  before_row jsonb;
  after_row jsonb;
  old_bal int;
  new_bal int;
  actual_amount int;
begin
  if not public._is_admin() then raise exception 'Admin access required'; end if;
  cleaned_reason := public._admin_require_reason(p_reason);
  if coalesce(p_amount, 0) = 0 then raise exception 'Point adjustment cannot be zero'; end if;

  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'Player not found';
  end if;

  insert into public.season_scores (user_id, season)
  values (p_user, yr)
  on conflict do nothing;

  select to_jsonb(s), s.points into before_row, old_bal
    from public.season_scores s
   where s.user_id = p_user and s.season = yr;

  update public.season_scores
     set points = greatest(0, points + p_amount)
   where user_id = p_user and season = yr
   returning points into new_bal;
  actual_amount := new_bal - old_bal;

  insert into public.point_history (user_id, season, kind, label, amount, balance)
  values (p_user, yr, 'admin_adjustment', cleaned_label, actual_amount, new_bal);

  select to_jsonb(s) into after_row
    from public.season_scores s
   where s.user_id = p_user and s.season = yr;

  perform public._admin_log(p_user, 'points_adjustment', cleaned_reason, before_row, after_row);
  return query select p_user, new_bal;
end; $$;

create or replace function public.admin_grant_trophy(
  p_user uuid,
  p_kind text,
  p_icon text,
  p_title text,
  p_sub text default '',
  p_event_id text default null,
  p_event_title text default null,
  p_reason text default null
)
returns table(id text, user_id uuid, kind text, icon text, title text, sub text)
language plpgsql security definer
set search_path = '' as $$
declare
  yr int := extract(year from now())::int;
  cleaned_reason text;
  cleaned_kind text := lower(btrim(coalesce(p_kind, 'award')));
  cleaned_icon text := left(btrim(coalesce(p_icon, 'PKO')), 16);
  cleaned_title text := btrim(coalesce(p_title, 'Admin Award'));
  cleaned_sub text := btrim(coalesce(p_sub, ''));
  trophy_id text;
  after_row jsonb;
begin
  if not public._is_admin() then raise exception 'Admin access required'; end if;
  cleaned_reason := public._admin_require_reason(p_reason);
  if cleaned_kind not in ('badge','belt','award','penalty','event') then
    raise exception 'Choose a valid reward kind';
  end if;
  if length(cleaned_title) < 2 or length(cleaned_title) > 80 then
    raise exception 'Reward title must be 2 to 80 characters';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user) then
    raise exception 'Player not found';
  end if;

  trophy_id := p_user::text || ':admin:' ||
    regexp_replace(lower(cleaned_title), '[^a-z0-9]+', '-', 'g') || ':' ||
    floor(extract(epoch from clock_timestamp()))::text;

  insert into public.trophies (id, user_id, season, event_id, event_title, kind, icon, title, sub)
  values (trophy_id, p_user, yr, nullif(btrim(coalesce(p_event_id, '')), ''),
    nullif(btrim(coalesce(p_event_title, '')), ''), cleaned_kind, cleaned_icon, cleaned_title, cleaned_sub);

  select to_jsonb(t) into after_row from public.trophies t where t.id = trophy_id;

  perform public._admin_log(p_user, 'trophy_grant', cleaned_reason, null, after_row);
  return query
    select t.id, t.user_id, t.kind, t.icon, t.title, t.sub
    from public.trophies t
    where t.id = trophy_id;
end; $$;

create or replace function public.admin_revoke_trophy(
  p_trophy_id text,
  p_reason text
)
returns void language plpgsql security definer
set search_path = '' as $$
declare
  cleaned_reason text;
  before_row jsonb;
  target uuid;
begin
  if not public._is_admin() then raise exception 'Admin access required'; end if;
  cleaned_reason := public._admin_require_reason(p_reason);

  select to_jsonb(t), t.user_id into before_row, target
    from public.trophies t
   where t.id = p_trophy_id;
  if before_row is null then raise exception 'Reward not found'; end if;

  delete from public.trophies where id = p_trophy_id;
  update public.profiles
     set showcase_item_id = null,
         showcase_icon = null,
         showcase_title = null
   where id = target and showcase_item_id = p_trophy_id;

  perform public._admin_log(target, 'trophy_revoke', cleaned_reason, before_row, null);
end; $$;

create or replace function public.admin_get_player_trophies(p_user uuid)
returns table(id text, kind text, icon text, title text, sub text, season int, event_id text, created_at timestamptz)
language plpgsql security definer
set search_path = '' as $$
begin
  if not public._is_admin() then raise exception 'Admin access required'; end if;
  return query
    select t.id, t.kind, t.icon, t.title, t.sub, t.season, t.event_id, t.created_at
    from public.trophies t
    where t.user_id = p_user
    order by t.created_at desc;
end; $$;

create or replace function public.admin_get_audit_log(p_limit int default 50)
returns table(
  id bigint,
  admin_email text,
  target_user_id uuid,
  action text,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz
)
language plpgsql security definer
set search_path = '' as $$
begin
  if not public._is_admin() then raise exception 'Admin access required'; end if;
  return query
    select l.id, l.admin_email, l.target_user_id, l.action, l.reason,
      l.before_state, l.after_state, l.created_at
    from public.admin_audit_log l
    order by l.created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 200));
end; $$;

create or replace function public._award_event_trophies(p_event text)
returns void language plpgsql security definer
set search_path = '' as $$
declare
  yr int := extract(year from now())::int;
  ev public.events%rowtype;
  row record;
  badge_title text;
  badge_icon text;
begin
  select * into ev from public.events where event_id = p_event;
  if ev.event_id is null then return; end if;

  if exists (
    select 1
    from public.predictions pr
    join public.event_bouts b on b.event_id = pr.event_id and b.bout_id = pr.bout_id
    where pr.event_id = p_event
      and b.playable = true
      and b.card_section = 'main'
      and pr.settled = false
  ) then
    return;
  end if;

  for row in
    select
      pr.user_id,
      row_number() over (
        order by
          (coalesce(sum(case when pr.result in ('void','draw','cancelled') then pr.stake else pr.won end), 0) - coalesce(sum(pr.stake), 0)) desc,
          count(*) filter (where pr.settled and pr.result not in ('void','draw','cancelled') and pr.won > 0) desc,
          min(pr.created_at) asc
      )::int as event_rank
    from public.predictions pr
    join public.event_bouts b on b.event_id = pr.event_id and b.bout_id = pr.bout_id
    join public.profiles p on p.id = pr.user_id
    where pr.event_id = p_event
      and p.name_chosen = true
      and b.playable = true
      and b.card_section = 'main'
    group by pr.user_id
  loop
    insert into public.trophies (id, user_id, season, event_id, event_title, kind, icon, title, sub)
    values (
      row.user_id::text || ':' || p_event || ':played',
      row.user_id, yr, p_event, ev.title, 'badge', 'PKO', 'Fought the Main Card', ev.short_title
    )
    on conflict (id) do nothing;

    if row.event_rank between 1 and 5 then
      badge_title := case row.event_rank
        when 1 then 'Gold Event Badge'
        when 2 then 'Silver Event Badge'
        when 3 then 'Bronze Event Badge'
        when 4 then 'Copper Event Badge'
        else 'Iron Event Badge'
      end;
      badge_icon := case row.event_rank
        when 1 then 'GOLD'
        when 2 then 'SILV'
        when 3 then 'BRNZ'
        when 4 then 'COPR'
        else 'IRON'
      end;

      insert into public.trophies (id, user_id, season, event_id, event_title, kind, icon, title, sub)
      values (
        row.user_id::text || ':' || p_event || ':place-' || row.event_rank::text,
        row.user_id, yr, p_event, ev.title, 'badge', badge_icon, badge_title,
        '#' || row.event_rank::text || ' for ' || ev.short_title
      )
      on conflict (id) do nothing;

      insert into public.trophies (id, user_id, season, event_id, event_title, kind, icon, title, sub)
      values (
        row.user_id::text || ':' || p_event || ':belt-' || row.event_rank::text,
        row.user_id, yr, p_event, ev.title, 'belt', 'BELT',
        case row.event_rank
          when 1 then 'Undisputed Champ'
          when 2 then 'Interim Champ'
          when 3 then '#1 Contender'
          when 4 then 'Top Contender'
          else 'Ranked Contender'
        end,
        '#' || row.event_rank::text || ' - cosmetic only'
      )
      on conflict (id) do nothing;
    end if;
  end loop;
end; $$;

-- Shared settlement core. Writes points, the immutable ledger, the bout_results
-- row, an audit entry, and trophy awards in one transaction. Callers gate access
-- (admin email vs. service_role) BEFORE invoking this; the core itself trusts its
-- caller. `p_source` records who settled ('admin' | 'auto') in the audit log.
create or replace function public._settle_bout_core(
  p_event text,
  p_bout text,
  p_result text,
  p_win_type text,
  p_method_detail text,
  p_settled_by uuid,
  p_source text
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
  result_row jsonb;
  open_main int;
begin
  if p_result is null or p_result not in ('a','b','void','draw','cancelled') then
    raise exception 'Invalid result';
  end if;
  if not exists (select 1 from public.event_bouts where event_id = p_event and bout_id = p_bout) then
    raise exception 'Bout is not configured for this event';
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
    refunded_total, p_settled_by, now()
  );

  select to_jsonb(b) into result_row
    from public.bout_results b
   where b.event_id = p_event and b.bout_id = p_bout;

  -- audit directly (service_role callers have no admin JWT, so we can't use
  -- _admin_log which requires _is_admin()).
  insert into public.admin_audit_log (
    admin_user_id, admin_email, target_user_id, action, reason, before_state, after_state
  )
  values (
    p_settled_by,
    coalesce(nullif(p_source, ''), 'system') || '-settlement',
    null,
    'bout_settlement',
    case when p_source = 'auto' then 'Automated cross-checked result settlement'
         else 'Official/manual result settlement' end,
    null,
    result_row
  );

  perform public._award_event_trophies(p_event);

  -- if every playable main-card bout now has a result, mark the event settled
  select count(*) into open_main
    from public.event_bouts b
    left join public.bout_results r
      on r.event_id = b.event_id and r.bout_id = b.bout_id
   where b.event_id = p_event and b.playable = true and b.card_section = 'main'
     and r.bout_id is null;
  if open_main = 0 then
    update public.events set status = 'settled'
     where event_id = p_event and status <> 'archived';
  end if;

  settled_count := settled_total;
  refunded_count := refunded_total;
  win_count := wins_total;
  loss_count := losses_total;
  return next;
end; $$;

-- Manual settlement from the in-app admin tools (gated by admin email allowlist).
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
begin
  if not public._is_admin() then
    raise exception 'Admin access required';
  end if;
  return query
    select * from public._settle_bout_core(
      p_event, p_bout, p_result, p_win_type, p_method_detail, auth.uid(), 'admin'
    );
end; $$;

-- Automated settlement entry point for the scheduled cross-check job. Callable
-- ONLY with the Supabase service_role key (server-side CI), never from the
-- browser anon/auth roles. The job only invokes this for bouts where two
-- independent sources AGREE on the outcome (the confidence gate); ambiguous
-- bouts are left for a human admin.
create or replace function public.auto_settle_bout(
  p_event text,
  p_bout text,
  p_result text,
  p_win_type text default null,
  p_method_detail text default null
)
returns table(settled_count int, refunded_count int, win_count int, loss_count int)
language plpgsql security definer
set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'auto_settle_bout requires the service_role key';
  end if;
  return query
    select * from public._settle_bout_core(
      p_event, p_bout, p_result, p_win_type, p_method_detail, null, 'auto'
    );
end; $$;

-- Lock down the automated entry point: only the server-side service_role may call it.
revoke all on function public.auto_settle_bout(text, text, text, text, text) from public;
revoke all on function public.auto_settle_bout(text, text, text, text, text) from anon;
revoke all on function public.auto_settle_bout(text, text, text, text, text) from authenticated;
grant execute on function public.auto_settle_bout(text, text, text, text, text) to service_role;
-- The shared core is internal; never expose it to client roles.
revoke all on function public._settle_bout_core(text, text, text, text, text, uuid, text) from public;
revoke all on function public._settle_bout_core(text, text, text, text, text, uuid, text) from anon;
revoke all on function public._settle_bout_core(text, text, text, text, text, uuid, text) from authenticated;

-- Current configured live-event bonuses. Keep this aligned with `js/data.js`.
insert into public.event_bonus_windows (bonus_id, event_id, label, description, amount, starts_at, ends_at)
values
  ('ufc-329-live-checkin', 'ufc-329', 'Live event check-in', 'Visit during the live card and claim this one-time event bonus.', 329, '2026-07-11T18:00:00-07:00', '2026-07-11T23:00:00-07:00'),
  ('ufc-329-main-event', 'ufc-329', 'Main event bonus', 'Available only during the expected five-round main event window.', 200, '2026-07-11T22:35:00-07:00', '2026-07-11T23:00:00-07:00')
on conflict (bonus_id) do update set
  event_id = excluded.event_id,
  label = excluded.label,
  description = excluded.description,
  amount = excluded.amount,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at;

insert into public.events (
  event_id, title, short_title, season, lock_time, starts_at, ends_at,
  status, real_title, date_text, venue, location
)
values (
  'ufc-329',
  'UFC 329 - Knockout King vs The Blessed',
  'UFC 329',
  2026,
  '2026-07-11T18:00:00-07:00',
  '2026-07-11T18:00:00-07:00',
  '2026-07-11T23:00:00-07:00',
  'upcoming',
  'Based on UFC 329: McGregor vs. Holloway 2',
  'Sat Jul 11, 2026 · T-Mobile Arena, Las Vegas',
  'T-Mobile Arena',
  'Las Vegas, Nevada, U.S.'
)
on conflict (event_id) do update set
  title = excluded.title,
  short_title = excluded.short_title,
  season = excluded.season,
  lock_time = excluded.lock_time,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  status = excluded.status,
  real_title = excluded.real_title,
  date_text = excluded.date_text,
  venue = excluded.venue,
  location = excluded.location;

insert into public.event_bouts (
  event_id, bout_id, card_section, playable, weight, side_a, side_b, odds_a, odds_b
)
values
  ('ufc-329', 'b1', 'main', true, 'WELTERWEIGHT', 'Conor McGregor', 'Max Holloway', 150, -180),
  ('ufc-329', 'b2', 'main', true, 'LIGHTWEIGHT', 'Paddy Pimblett', 'Benoit Saint Denis', -145, 125),
  ('ufc-329', 'b3', 'main', true, 'BANTAMWEIGHT', 'Cory Sandhagen', 'Mario Bautista', -200, 170),
  ('ufc-329', 'b4', 'undercard', false, 'FLYWEIGHT', 'Brandon Royval', 'Loneer Kavanagh', -130, 110),
  ('ufc-329', 'b5', 'undercard', false, 'HEAVYWEIGHT', 'Gable Steveson', 'Elisha Ellison', -300, 240),
  ('ufc-329', 'b6', 'undercard', false, 'LIGHT HEAVY', 'Robert Whittaker', 'Nikita Krylov', -160, 140)
on conflict (event_id, bout_id) do update set
  card_section = excluded.card_section,
  playable = excluded.playable,
  weight = excluded.weight,
  side_a = excluded.side_a,
  side_b = excluded.side_b,
  odds_a = excluded.odds_a,
  odds_b = excluded.odds_b;

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
