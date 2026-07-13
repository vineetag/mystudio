export default function ReleaseNotesPage() {
  return (
    <main className="mx-auto max-w-3xl px-8 py-16">
      <h1 className="text-3xl font-bold">Release Notes</h1>
      <div className="mt-8 space-y-8">
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
