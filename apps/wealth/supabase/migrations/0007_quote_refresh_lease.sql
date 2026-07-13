-- Global lease that bounds Finnhub spend. /api/quotes only refreshes when it
-- can move this timestamp forward (at most once per poll interval), so any
-- number of concurrent dashboards — multiple tabs, devices, or visitors —
-- share a single rate-paced refresh batch per minute instead of each spending
-- the 60-calls/min free-tier budget independently.

create table pt_quote_refresh_lease (
  id text primary key,
  last_run_at timestamptz not null
);

alter table pt_quote_refresh_lease enable row level security;
-- No policies on purpose: only the service-role client (which bypasses RLS)
-- ever reads or writes the lease.

insert into pt_quote_refresh_lease (id, last_run_at) values ('global', 'epoch');
