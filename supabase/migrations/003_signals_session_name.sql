-- Migration 003: add session_name to signals (denormalized from parent scan row)
alter table signals
  add column if not exists session_name text;

-- Backfill existing rows from scans table
update signals s
set session_name = sc.session_name
from scans sc
where s.scan_id = sc.id
  and s.session_name is null;

create index if not exists idx_signals_session_name on signals(session_name);
