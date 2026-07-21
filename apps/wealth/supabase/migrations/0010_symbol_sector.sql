-- OneFolio M3: per-symbol sector, feeding the visual analyzer's allocation donut.
--
-- Finnhub's profile2 response already carries `finnhubIndustry` for equities, so
-- sector rides along on the name/domain fetch we already make once per symbol —
-- no extra API calls, no extra rate-limit budget.

alter table pt_symbols
  add column sector text check (sector is null or char_length(sector) between 1 and 60);

-- When we last ran a profile fetch for this row. Distinct from `fetched_at`
-- (row creation) because a null sector is ambiguous on its own: it means either
-- "never looked" or "looked, and Finnhub can't classify this symbol" (mutual
-- funds, collective trusts). Without this stamp the second case would re-fetch
-- on every background warm, forever. Existing rows start null so each gets
-- exactly one sector backfill attempt, then is stamped either way.
alter table pt_symbols add column profile_fetched_at timestamptz;
