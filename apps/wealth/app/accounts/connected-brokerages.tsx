"use client"

import { useState, useTransition } from "react"
import {
  disconnectSnapTradeConnection,
  getConnectPortalUrl,
  syncSnapTradeNow,
} from "@/modules/snaptrade/actions"
import type { SnapTradeConnection } from "@/modules/snaptrade/types"
import { BrokerLogo } from "@/components/broker-logo"
import { formatAsOf } from "@/lib/format"

const STATUS_STYLES: Record<SnapTradeConnection["status"], string> = {
  connected: "bg-moss/10 text-moss",
  syncing: "bg-ink/10 text-ink/70",
  error: "bg-red-100 text-red-800",
  disabled: "bg-amber-100 text-amber-800",
}

export function ConnectedBrokerages({
  connections,
}: {
  connections: SnapTradeConnection[]
}) {
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleConnect() {
    setError("")
    setNotice("")
    startTransition(async () => {
      const result = await getConnectPortalUrl()
      if (!result.ok) {
        setError(result.error)
        return
      }
      // Portal URLs expire in ~5 minutes — go straight there.
      window.location.href = result.data
    })
  }

  function handleSync() {
    setError("")
    setNotice("")
    startTransition(async () => {
      const result = await syncSnapTradeNow()
      if (!result.ok) {
        setError(result.error)
        return
      }
      const { accounts, holdings, skipped } = result.data
      setNotice(
        `Synced ${holdings} holdings across ${accounts} accounts.` +
          (skipped.length > 0 ? ` Skipped ${skipped.length}: ${skipped.join("; ")}` : ""),
      )
    })
  }

  function handleDisconnect(connection: SnapTradeConnection) {
    if (
      !window.confirm(
        `Disconnect ${connection.broker}? Its accounts stay but stop updating.`,
      )
    ) {
      return
    }
    setError("")
    setNotice("")
    startTransition(async () => {
      const result = await disconnectSnapTradeConnection(connection.id)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <section className="rounded-lg border border-rule p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Connected brokerages</h2>
          <p className="mt-0.5 text-sm text-ink/60">
            Read-only sync via SnapTrade — positions only, never credentials.
          </p>
        </div>
        <div className="flex gap-2">
          {connections.length > 0 && (
            <button
              onClick={handleSync}
              disabled={isPending}
              className="min-h-12 rounded-md border border-rule px-4 text-sm font-medium text-ink/80 hover:bg-ink/[0.04] disabled:opacity-50"
            >
              {isPending ? "Working…" : "Sync now"}
            </button>
          )}
          <button
            onClick={handleConnect}
            disabled={isPending}
            className="min-h-12 rounded-md bg-ink px-4 text-sm font-medium text-paper disabled:opacity-50"
          >
            Connect brokerage
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-3 rounded-md border border-rule bg-moss/5 px-3 py-2 text-sm text-ink/80">
          {notice}
        </p>
      )}

      {connections.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y divide-rule/60">
          {connections.map((connection) => (
            <li
              key={connection.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div className="flex items-center gap-2.5">
                <BrokerLogo broker={connection.broker} logoUrl={connection.logoUrl} size={24} />
                <span className="font-medium text-ink">{connection.broker}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLES[connection.status]}`}
                >
                  {connection.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-ink/60">
                {connection.lastSyncedAt && (
                  <span>synced {formatAsOf(connection.lastSyncedAt).replace("as of ", "")}</span>
                )}
                <button
                  onClick={() => handleDisconnect(connection)}
                  disabled={isPending}
                  className="min-h-12 px-2 text-sm text-loss underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
              {connection.lastError && (
                <p className="w-full text-sm text-amber-800">{connection.lastError}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
