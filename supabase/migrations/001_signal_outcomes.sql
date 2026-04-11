-- Migration 001: add outcome tracking to signals, create source_stats
-- Run in Supabase SQL editor after schema.sql

-- Add outcome columns to signals
alter table signals
  add column if not exists outcome   text,      -- HIT | MISS | PARTIAL | EXPIRED
  add column if not exists pnl_pips  numeric;   -- optional pips/points result

-- Aggregated source accuracy table (one row per @handle)
create table if not exists source_stats (
  handle          text        primary key,
  total_signals   integer     not null default 0,
  hit_count       integer     not null default 0,
  miss_count      integer     not null default 0,
  partial_count   integer     not null default 0,
  accuracy_pct    numeric     generated always as (
    case when (hit_count + miss_count + partial_count) > 0
      then round(hit_count::numeric / (hit_count + miss_count + partial_count)::numeric * 100, 1)
      else null
    end
  ) stored,
  last_updated    timestamptz default now()
);

create index if not exists idx_source_stats_accuracy on source_stats(accuracy_pct desc nulls last);
