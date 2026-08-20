-- =============================================================================
-- Alpha Coach — initial schema (Supabase-ready Postgres)
-- Migration: 0001_init
-- Author: Claude engineer (hive) · Date: 2026-08-20
--
-- Architecture doc: office/local-first-photo-kcal-architecture.md  (§2.2 Supabase)
-- Invariants:       CLAUDE.md §"Non-negotiable invariants"
--
-- LOCAL-FIRST NOTE: This file is authored to sit ON DISK, unrun. No hosted
-- project is created (architecture §2.2, §4). It runs later either against a
-- local Supabase stack (`supabase start`) or a hosted project once the human
-- says "connect it to a server". The app does NOT depend on it to function; the
-- SupabaseAdapter is dormant behind a flag.
--
-- INVARIANT #1 is encoded in the SCHEMA itself: `meals` carries BOTH
--   ate_at    timestamptz NOT NULL  -- when the food was eaten (the anchor)
--   logged_at timestamptz NOT NULL  -- when the entry was typed in
-- They are distinct facts. Meal punctuality and logging punctuality are scored
-- separately (see app: classifyLog / scoreMealLog). A photo's capture time is a
-- *logged* time; it never silently becomes ate_at.
--
-- INVARIANT #2: `points_ledger` is APPEND-ONLY and mirrors the app's
-- Points.award() codes. It is the only scoring write path; no scoring logic
-- lives in this data layer.
--
-- INVARIANT #3: every new capability is opt-in / default-off. Nothing here is a
-- prerequisite for the core loop.
--
-- INVARIANT #5: kcal/macros are always ESTIMATES with a confidence; photo
-- classifications carry a confidence and a needs-confirmation flag.
-- =============================================================================

-- Supabase provides auth.users and the auth.uid() helper. If running against a
-- bare Postgres (no Supabase), create a shim so the file still applies:
--   create schema if not exists auth;
--   create or replace function auth.uid() returns uuid language sql stable
--     as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;

begin;

-- Needed for gen_random_uuid(). Supabase enables pgcrypto by default; guard anyway.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- profiles — one row per authenticated user; app-level preferences & opt-ins.
-- Purpose: hold per-user settings (wake-anchor prefs, feature opt-ins) keyed to
--          auth.users. All new features are default-OFF here (invariant #3).
-- Doc: office/local-first-photo-kcal-architecture.md §2.1 (store adapter).
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  display_name       text,
  -- Feature opt-ins. Default FALSE — a fresh profile behaves byte-identically to
  -- today's offline single-file app (invariant #3).
  photo_logging_on   boolean not null default false,
  kcal_engine_on     boolean not null default false,
  account_sync_on    boolean not null default false,
  settings           jsonb  not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table  public.profiles is
  'Per-user prefs & feature opt-ins (all default-off, invariant #3). Keyed to auth.users. See office/local-first-photo-kcal-architecture.md §2.1.';
comment on column public.profiles.photo_logging_on is 'Opt-in flag; photo logging ships OFF (invariant #3).';
comment on column public.profiles.kcal_engine_on   is 'Opt-in flag; kcal engine ships OFF (invariant #3).';

-- -----------------------------------------------------------------------------
-- days — one row per user per eating-session ("day"); the wake-anchored unit.
-- Purpose: mirror the app's session/day concept (a session starting 23:00 is
--          still one day). `day_key` is the app's dayKey()/sessionKey() string.
-- Doc: office/local-first-photo-kcal-architecture.md §2.2.
-- -----------------------------------------------------------------------------
create table if not exists public.days (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  day_key       text not null,                 -- app sessionKey()/dayKey()
  awoke_at      timestamptz,                   -- the "I'm awake" anchor (may be null pre-wake)
  streak        integer not null default 0,
  full_day      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, day_key)
);

comment on table public.days is
  'One row per user per wake-anchored eating session. day_key mirrors app sessionKey(). See architecture §2.2.';
comment on column public.days.awoke_at is 'The "I''m awake" timestamp every meal time derives from. Null before wake.';

-- -----------------------------------------------------------------------------
-- meals — a logged meal event. INVARIANT #1 lives here: ate_at != logged_at.
-- Purpose: record what was eaten, WHEN it was eaten (ate_at, the schedule
--          anchor) and WHEN it was entered (logged_at). Both NOT NULL, distinct.
-- Doc: office/local-first-photo-kcal-architecture.md §0 (#1), §2.3 step 5.
-- -----------------------------------------------------------------------------
create table if not exists public.meals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  day_id         uuid not null references public.days (id) on delete cascade,
  meal_ref       text,                          -- app meal.id within the plan
  meal_name      text,
  status         text not null default 'done'
                   check (status in ('done','missed','skipped')),
  -- INVARIANT #1 — two distinct, both-required timestamps:
  ate_at         timestamptz not null,          -- when the food was eaten  (ANCHOR)
  logged_at      timestamptz not null,          -- when the entry was typed in
  planned_at     timestamptz,                   -- the plan's scheduled time (for scoring)
  time_confirmed boolean not null default false,-- user set the real eating time
  -- Nutrition snapshot at log time (all ESTIMATES; invariant #5). See kcalEngine.
  kcal           numeric(8,2),
  protein_g      numeric(8,2),
  carbs_g        numeric(8,2),
  fat_g          numeric(8,2),
  kcal_source    text check (kcal_source in ('label','barcode','manual')),
  kcal_confidence numeric(4,3) check (kcal_confidence between 0 and 1),
  is_estimate    boolean not null default true, -- kcal is ALWAYS an estimate (invariant #5)
  created_at     timestamptz not null default now(),
  -- Belt-and-braces: the two facts are allowed to differ, and the anchor is real.
  -- (They MAY be equal when logged instantly; the point is both are stored, never
  --  collapsed — a photo never silently sets ate_at = now.)
  constraint meals_estimate_is_true check (is_estimate = true)
);

comment on table public.meals is
  'A logged meal. INVARIANT #1: ate_at (eaten, the schedule anchor) and logged_at (entered) are BOTH NOT NULL and distinct facts. kcal fields are estimates (invariant #5). See architecture §0/§2.3.';
comment on column public.meals.ate_at    is 'INVARIANT #1: when the food was EATEN — the schedule anchor. Never silently set to now() by a photo.';
comment on column public.meals.logged_at is 'INVARIANT #1: when the entry was TYPED IN — a distinct fact from ate_at.';
comment on column public.meals.is_estimate is 'INVARIANT #5: kcal is always an estimate, never presented as truth.';

create index if not exists meals_user_ate_at_idx on public.meals (user_id, ate_at);
create index if not exists meals_day_idx          on public.meals (day_id);

-- -----------------------------------------------------------------------------
-- meal_photos — an on-device photo + its classification. Storage ref only.
-- Purpose: link a meal to a photo (kept as a Supabase Storage object ref LATER;
--          locally the blob lives in IndexedDB and never leaves the device) plus
--          the classifier's label + confidence. Low confidence => ask, not assert.
-- Doc: office/local-first-photo-kcal-architecture.md §2.3.
-- -----------------------------------------------------------------------------
create table if not exists public.meal_photos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  meal_id         uuid references public.meals (id) on delete cascade,
  storage_path    text,                          -- Supabase Storage ref (null while purely local)
  captured_at     timestamptz not null default now(), -- a LOGGED time, NOT ate_at (invariant #1)
  label           text,                          -- top-1 Food-101 class
  label_confidence numeric(4,3) check (label_confidence between 0 and 1),
  topk            jsonb,                          -- [{label,confidence}...] top-k
  needs_confirmation boolean not null default true, -- invariant #5: user confirms
  created_at      timestamptz not null default now()
);

comment on table public.meal_photos is
  'On-device photo + Food-101 classification. captured_at is a LOGGED time, never ate_at (invariant #1). Low confidence => needs_confirmation (invariant #5). Blob stays on-device (IndexedDB) locally; storage_path used only once hosted. See architecture §2.3.';
comment on column public.meal_photos.captured_at is 'Photo capture time = a LOGGED time. Never becomes ate_at (invariant #1).';

create index if not exists meal_photos_meal_idx on public.meal_photos (meal_id);

-- -----------------------------------------------------------------------------
-- food_items — the derived nutrition lookup (barcode + label -> kcal/macros).
-- Purpose: server-side mirror of the bundled foodDb.json (built offline from
--          Open Food Facts (ODbL) + Nutrition5k). Every value is a per-serving
--          ESTIMATE. Read-mostly reference data (not per-user), so RLS allows
--          read to any authenticated user; writes are service-role only.
-- Doc: office/local-first-photo-kcal-architecture.md §2.4; build-fooddb.mjs.
-- -----------------------------------------------------------------------------
create table if not exists public.food_items (
  id            uuid primary key default gen_random_uuid(),
  key           text unique not null,           -- normalized name / class key
  name          text not null,
  barcode       text,                            -- OFF barcode (nullable)
  kcal          numeric(8,2) not null,           -- per one standard serving
  protein_g     numeric(8,2) not null,
  carbs_g       numeric(8,2) not null,
  fat_g         numeric(8,2) not null,
  serving_g     numeric(8,2) not null,           -- grams in that standard serving
  source        text,                            -- 'openfoodfacts' | 'nutrition5k' | 'seed'
  -- ODbL attribution travels WITH the data (share-alike). See file header + build script.
  attribution   text not null default
    'Contains information from Open Food Facts (https://openfoodfacts.org), made available under the Open Database License (ODbL) v1.0.',
  created_at    timestamptz not null default now()
);

comment on table public.food_items is
  'Derived nutrition lookup (barcode + label -> per-serving kcal/macros ESTIMATE). Built offline from Open Food Facts (ODbL) + Nutrition5k by office/supabase/build-fooddb.mjs. ODbL attribution stored per row (share-alike). Reference data; not per-user. See architecture §2.4.';
comment on column public.food_items.attribution is 'ODbL attribution — required by Open Food Facts license (share-alike). Ships with the data.';

create index if not exists food_items_barcode_idx on public.food_items (barcode);

-- -----------------------------------------------------------------------------
-- points_ledger — APPEND-ONLY scoring ledger. Mirrors app Points.award().
-- Purpose: durable copy of the app's points ledger. INVARIANT #2: the only
--          scoring write path is award(); this table stores what award() emits
--          and enforces append-only (no UPDATE, no DELETE) at the DB level.
-- Columns mirror the app ledger entry: {id, at, day, code, pts, label, reason, ref}.
-- Codes mirror RULES in alpha-coach.html (constrained below).
-- Doc: office/local-first-photo-kcal-architecture.md §2.2; app RULES table.
-- -----------------------------------------------------------------------------
create table if not exists public.points_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  entry_id    text,                              -- app-side uid() of the entry
  awarded_at  timestamptz not null default now(),-- app entry.at
  day_key     text not null,                     -- app entry.day (sessionKey)
  code        text not null check (code in (
                'MEAL_ON_TIME','MEAL_LOGGED_ON_TIME','LOGGED_HONESTLY','TIME_CONFIRMED',
                'SEQUENCE_KEPT','SUPP_ON_TIME','WORKOUT_ON_TIME','INVENTORY_UPDATED',
                'FULL_DAY','STREAK_DAY','LOG_LATE','MEAL_LATE','SKIPPED_UNRECORDED',
                'LATE_CORRECTION','MEAL_NEVER_LOGGED','NEVER_LOGGED_VOIDED',
                'STREAK_BROKEN')),
  pts         integer not null,                  -- resolved points from award()
  label       text,
  reason      text,
  ref         text,                              -- referenced meal/action id
  created_at  timestamptz not null default now()
);

comment on table public.points_ledger is
  'APPEND-ONLY scoring ledger mirroring app Points.award() (invariant #2 — the only scoring write path). Columns mirror the app ledger entry; code CHECK mirrors RULES in alpha-coach.html. No scoring logic lives in this data layer. See architecture §2.2.';
comment on column public.points_ledger.code is 'Mirrors app RULES codes. Unknown codes are rejected (matches award() ignoring unknown codes).';

create index if not exists points_ledger_user_day_idx on public.points_ledger (user_id, day_key);

-- Enforce APPEND-ONLY at the database (invariant #2): block UPDATE and DELETE.
create or replace function public.points_ledger_append_only()
  returns trigger language plpgsql as $$
begin
  raise exception 'points_ledger is append-only (invariant #2): % not allowed', tg_op;
end;
$$;

drop trigger if exists points_ledger_no_update on public.points_ledger;
create trigger points_ledger_no_update
  before update on public.points_ledger
  for each row execute function public.points_ledger_append_only();

drop trigger if exists points_ledger_no_delete on public.points_ledger;
create trigger points_ledger_no_delete
  before delete on public.points_ledger
  for each row execute function public.points_ledger_append_only();

-- keep updated_at fresh on the mutable tables
create or replace function public.touch_updated_at()
  returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists days_touch on public.days;
create trigger days_touch before update on public.days
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- Row-Level Security — every per-user table keyed on user_id = auth.uid().
-- =============================================================================
alter table public.profiles      enable row level security;
alter table public.days          enable row level security;
alter table public.meals         enable row level security;
alter table public.meal_photos   enable row level security;
alter table public.points_ledger enable row level security;
alter table public.food_items    enable row level security;

-- profiles: the row's PK IS the user id.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- days
drop policy if exists days_all on public.days;
create policy days_all on public.days
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- meals
drop policy if exists meals_all on public.meals;
create policy meals_all on public.meals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- meal_photos
drop policy if exists meal_photos_all on public.meal_photos;
create policy meal_photos_all on public.meal_photos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- points_ledger: users may read and INSERT their own rows. No update/delete
-- policy is granted (and triggers block those ops regardless) => append-only.
drop policy if exists points_ledger_select on public.points_ledger;
create policy points_ledger_select on public.points_ledger
  for select using (user_id = auth.uid());
drop policy if exists points_ledger_insert on public.points_ledger;
create policy points_ledger_insert on public.points_ledger
  for insert with check (user_id = auth.uid());

-- food_items: shared reference data. Any authenticated user may READ; writes are
-- reserved for the service role (which bypasses RLS), so no write policy here.
drop policy if exists food_items_select on public.food_items;
create policy food_items_select on public.food_items
  for select using (auth.uid() is not null);

commit;
