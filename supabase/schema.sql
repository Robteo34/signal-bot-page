-- Signal Bot — Supabase schema
-- Run this in the Supabase SQL editor: https://supabase.com/dashboard/project/fjbnendiqedfqmebfipq/sql

-- ── scans ────────────────────────────────────────────────────────────────────
-- One row per completed scan (both SCAN + ANALYZE calls succeeded)
create table if not exists scans (
  id                  uuid        default gen_random_uuid() primary key,
  created_at          timestamptz default now(),
  session_name        text        not null,
  uk_date             text        not null,   -- e.g. "2026-04-11"
  uk_time             text        not null,   -- e.g. "14:32"
  tz_abbr             text        not null,   -- "BST" or "GMT"
  action              text,                   -- LONG | SHORT | WAIT | EXIT
  primary_asset       text,
  signal_strength     integer,
  data_quality        text,                   -- RICH | MODERATE | SPARSE | EMPTY (from scan phase)
  scan_duration_ms    integer,
  analyze_duration_ms integer,
  total_duration_ms   integer,
  raw_scan            jsonb,                  -- full JSON from Call 1
  raw_analysis        jsonb                   -- full JSON from Call 2
);

-- ── signals ──────────────────────────────────────────────────────────────────
-- One row per signal returned in the analysis
create table if not exists signals (
  id               uuid        default gen_random_uuid() primary key,
  created_at       timestamptz default now(),
  scan_id          uuid        references scans(id) on delete cascade,
  asset            text        not null,
  direction        text,                      -- LONG | SHORT | WAIT
  strength         integer,
  confidence_basis text,                      -- VERIFIED_SOURCE | MULTIPLE_SOURCES | INFERENCE | WEAK_DATA
  platform         text,                      -- IG | CRYPTO
  source           text,                      -- @handle or outlet
  reason           text,
  entry            text,
  stop             text,
  target           text,
  overnight_risk   text,                      -- HIGH | MEDIUM | LOW
  session_relevant boolean,
  session_name     text                       -- denormalized from parent scan row
);

-- ── source_scores ─────────────────────────────────────────────────────────────
-- One row per account checked in the scan — builds a longitudinal record
-- of which accounts are active and which get cited in actual signals
create table if not exists source_scores (
  id              uuid        default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  scan_id         uuid        references scans(id) on delete cascade,
  handle          text        not null,
  status          text        not null,       -- 'with_posts' | 'no_posts' | 'could_not_check'
  post_summary    text,                       -- populated for with_posts entries
  cited_in_signal boolean     default false   -- true if this handle appears as source in a signal
);

-- Indexes for common query patterns
create index if not exists idx_scans_created_at    on scans(created_at desc);
create index if not exists idx_scans_session       on scans(session_name);
create index if not exists idx_signals_scan_id     on signals(scan_id);
create index if not exists idx_signals_asset       on signals(asset);
create index if not exists idx_source_scores_scan  on source_scores(scan_id);
create index if not exists idx_source_scores_handle on source_scores(handle);
