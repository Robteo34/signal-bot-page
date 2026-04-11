-- Migration 002: add outcome_notes column for auto-verification audit trail
alter table signals
  add column if not exists outcome_notes text;
