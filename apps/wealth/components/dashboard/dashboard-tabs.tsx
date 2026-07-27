"use client"

import { useRef, type KeyboardEvent, type ReactNode } from "react"

export type DashboardTab = "overview" | "investments" | "cash" | "liabilities"

export const DASHBOARD_TABS: { id: DashboardTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "investments", label: "Investments" },
  { id: "cash", label: "Cash" },
  { id: "liabilities", label: "Liabilities" },
]

const TAB_IDS = DASHBOARD_TABS.map((tab) => tab.id)

export function parseTab(
  value: string | null | undefined,
  fallback: DashboardTab = "overview",
): DashboardTab {
  return TAB_IDS.includes(value as DashboardTab)
    ? (value as DashboardTab)
    : fallback
}

/**
 * Primary dashboard navigation — moss underline matches the holdings view
 * switcher, but ids use a `dash-` prefix so they never collide with the
 * `tab-`/`panel-` ids that switcher renders inside the Investments panel.
 */
export function DashboardTabBar({
  active,
  onSelect,
}: {
  active: DashboardTab
  onSelect: (tab: DashboardTab) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"]
    if (!keys.includes(event.key)) return
    event.preventDefault()
    const current = TAB_IDS.indexOf(active)
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? TAB_IDS.length - 1
          : event.key === "ArrowLeft"
            ? (current - 1 + TAB_IDS.length) % TAB_IDS.length
            : (current + 1) % TAB_IDS.length
    onSelect(TAB_IDS[next])
    listRef.current
      ?.querySelector<HTMLButtonElement>(`#dash-tab-${TAB_IDS[next]}`)
      ?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Dashboard sections"
      onKeyDown={onKeyDown}
      className="flex gap-1 overflow-x-auto border-b border-rule"
    >
      {DASHBOARD_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`dash-tab-${tab.id}`}
          aria-selected={active === tab.id}
          aria-controls={`dash-panel-${tab.id}`}
          tabIndex={active === tab.id ? 0 : -1}
          onClick={() => onSelect(tab.id)}
          className={`-mb-px flex min-h-12 shrink-0 cursor-pointer items-center border-b-2 px-3 text-sm font-medium transition-colors sm:px-4 ${
            active === tab.id
              ? "border-moss text-moss"
              : "border-transparent text-ink/60 hover:text-ink"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Panels stay mounted so table state (search, filters, expanded sections)
 * survives tab switches; inactive panels only get `display: none`. The class
 * must carry the hiding — a `hidden` attribute alone loses to any Tailwind
 * display class on the same element.
 */
export function TabPanel({
  id,
  active,
  children,
}: {
  id: DashboardTab
  active: boolean
  children: ReactNode
}) {
  return (
    <div
      role="tabpanel"
      id={`dash-panel-${id}`}
      aria-labelledby={`dash-tab-${id}`}
      hidden={!active}
      className={active ? "flex flex-col gap-10 pt-6" : "hidden"}
    >
      {children}
    </div>
  )
}
