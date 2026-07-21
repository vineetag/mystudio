export default function ReleaseNotesPage() {
  return (
    <main className="mx-auto max-w-3xl px-8 py-16">
      <h1 className="text-3xl font-bold">Release Notes</h1>
      <div className="mt-8 space-y-8">
        <section>
          <h2 className="text-lg font-semibold">v0.4.0 — July 2026</h2>
          <p className="mt-2 text-muted-foreground">
            A visual analyzer: four charts over the holdings you already track.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              Allocation donut — your value split by industry sector, or by asset
              class. Symbols the data provider can&rsquo;t classify (mutual funds,
              collective trusts) share one honest &ldquo;Unclassified&rdquo; bucket
              rather than being guessed into a sector.
            </li>
            <li>
              Position-size treemap — every holding drawn to scale, so the
              positions that actually move the portfolio are obvious at a glance.
            </li>
            <li>
              Per-ticker account split — for any ticker held in more than one
              account, how much of it sits where. Answers &ldquo;how much of my
              GOOG is in the 401k?&rdquo; without arithmetic.
            </li>
            <li>
              Projected dividend income — value × current yield per holding, over
              the next 12 months. Not a payment schedule: ex-dividend and pay
              dates aren&rsquo;t on our data plan, so we show the annual figure
              rather than invent months.
            </li>
            <li>
              Every chart names what it left out — holdings with no live price,
              and symbols with no dividend data are listed under the chart
              instead of being silently dropped.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold">v0.3.0 — July 2026</h2>
          <p className="mt-2 text-muted-foreground">
            AI analysis, with the cost shown before every run.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              Analyze a single holding, your whole portfolio, or research a ticker you
              don&rsquo;t own — each answer is built from your live figures, not guessed.
            </li>
            <li>
              Every run quotes its maximum cost before it starts, and a hard monthly
              spend cap refuses runs that would breach it. Past runs are listed with
              what each one cost.
            </li>
            <li>
              Three model tiers, cheapest by default, so a quick read on one position
              costs a fraction of a cent.
            </li>
            <li>
              Prompt wording is editable in Admin and takes effect on the next run — no
              deploy needed.
            </li>
            <li>
              Demo mode returns worked example analyses and never calls a paid API.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold">v0.2.0 — July 2026</h2>
          <p className="mt-2 text-muted-foreground">
            Cryptocurrency support across the whole portfolio.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              Crypto holdings (Bitcoin, Ethereum, Solana, Dogecoin, and 20+
              other coins) are now priced live from Coinbase spot data instead
              of showing as unavailable or matching an unrelated stock ticker.
            </li>
            <li>
              Crypto positions display the correct coin name and logo — SOL
              means Solana, not the equity that shares its ticker.
            </li>
            <li>
              Holdings imported from brokerages are tagged as crypto
              automatically, so pricing routes to the right data source.
            </li>
            <li>
              The demo portfolio now includes a crypto account, so you can see
              coin pricing without signing in.
            </li>
            <li>
              Fixed background jobs (symbol-name lookups and daily portfolio
              snapshots on dashboard visits) that were silently failing.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold">v0.1.0 — June 2026</h2>
          <p className="mt-2 text-muted-foreground">Initial launch of Wealth Tracker.</p>
        </section>
      </div>
    </main>
  )
}
