"use client"

import { ArrowDown, ArrowUp } from "lucide-react"
import type { ReactNode } from "react"
import type { ChangeChip } from "@/modules/snapshots/types"
import { GAIN_TEXT, LOSS_TEXT } from "@/components/holdings-table/columns"
import { formatMoney, formatSignedMoney, formatSignedPct } from "@/lib/format"
import { StatCard, StatGrid } from "./stat-card"

// Card labels for the period-over-period chips computed in modules/snapshots.
const CHIP_LABELS: Record<string, string> = {
  "D/D": "Today",
  "W/W": "1 week",
  "M/M": "1 month",
}

function ChangeCard({ chip }: { chip: ChangeChip }) {
  const tone = chip.abs === 0 ? "text-ink/70" : chip.abs > 0 ? GAIN_TEXT : LOSS_TEXT
  return (
    <StatCard
      label={CHIP_LABELS[chip.label] ?? chip.label}
      value={
        <>
          {chip.abs !== 0 &&
            (chip.abs > 0 ? (
              <ArrowUp className="h-4 w-4" aria-hidden />
            ) : (
              <ArrowDown className="h-4 w-4" aria-hidden />
            ))}
          {formatSignedPct(chip.pct)}
        </>
      }
      valueClassName={tone}
      sub={formatSignedMoney(chip.abs)}
      subClassName={tone}
    />
  )
}

/**
 * The portfolio stat row shared by the Overview and Investments tabs:
 * period-over-period change cards plus projected dividend income. Extra
 * cards (e.g. top movers on Investments) slot into the same grid via
 * children.
 */
export function PortfolioStatRow({
  chips,
  projectedAnnualIncome,
  children,
}: {
  chips: ChangeChip[]
  projectedAnnualIncome: number
  children?: ReactNode
}) {
  if (chips.length === 0 && projectedAnnualIncome <= 0 && !children) return null
  return (
    <StatGrid>
      {chips.map((chip) => (
        <ChangeCard key={chip.label} chip={chip} />
      ))}
      {projectedAnnualIncome > 0 && (
        <StatCard
          label="Dividends"
          value={`${formatMoney(projectedAnnualIncome)}/yr`}
          sub="projected"
        />
      )}
      {children}
    </StatGrid>
  )
}
