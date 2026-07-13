-- Broker-reported price (NAV) for holdings Finnhub can't quote: 401k mutual
-- funds (403 on the free tier) and opaque collective-trust fund IDs (e.g. O5L6,
-- PK7L) that have no public ticker anywhere. SnapTrade already returns this
-- price per position; the quote engine falls back to it when Finnhub has none.
-- Manual/CSV holdings leave both columns null and price via Finnhub as before.

alter table pt_holdings
  add column price numeric check (price is null or price >= 0),
  add column price_as_of timestamptz;

comment on column pt_holdings.price is
  'Broker-reported market price/NAV from the last sync; fallback when the symbol has no live quote. Null for manually entered holdings.';
comment on column pt_holdings.price_as_of is
  'When the broker reported pt_holdings.price. Shown as the "as of" timestamp for broker-sourced prices.';
