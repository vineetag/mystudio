"use client"

import Link from "next/link"

/** Shared empty state for the Overview and Investments panels. */
export function EmptyPortfolio({
  isOwner,
  hiddenAccountCount,
}: {
  isOwner: boolean
  hiddenAccountCount: number
}) {
  return (
    <div className="rounded-lg border border-dashed border-rule p-10 text-center">
      <h2 className="font-display text-xl font-medium text-ink">
        {!isOwner
          ? "Demo portfolio is empty"
          : hiddenAccountCount > 0
            ? "All accounts are hidden"
            : "Open the ledger"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/70">
        {!isOwner ? (
          "The demo data hasn't been seeded yet — check back soon."
        ) : hiddenAccountCount > 0 ? (
          <>
            Every account is currently hidden, so nothing counts toward the
            total. Unhide accounts to bring them back.
          </>
        ) : (
          <>
            Add your first brokerage account, then enter holdings by hand or import a CSV.
          </>
        )}
      </p>
      {isOwner && (
        <Link
          href="/accounts"
          className="mt-4 inline-flex min-h-12 items-center rounded-md bg-ink px-5 text-sm font-medium text-paper"
        >
          {hiddenAccountCount > 0 ? "Manage accounts" : "Add first account"}
        </Link>
      )}
    </div>
  )
}
