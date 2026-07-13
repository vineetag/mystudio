-- Distinguish cryptocurrency from equities/ETFs so the quote engine can route
-- to Finnhub's crypto candle endpoint instead of the stock /quote endpoint.

alter table pt_holdings
  add column asset_class text not null default 'equity'
  check (asset_class in ('equity', 'crypto'));

comment on column pt_holdings.asset_class is
  'equity = stock/ETF/mutual fund pricing via Finnhub /quote; crypto = spot pricing via Finnhub /crypto/candle.';
