// Canned analyses for demo mode (PRODUCT_SPEC.md guardrail 4: demo mode makes
// zero authenticated API calls — and, here, zero paid ones).
//
// Written against the seeded demo portfolio in scripts/seed-demo.ts so a
// visitor sees a response that actually matches the numbers on screen. The
// wording deliberately mirrors what the real prompts ask for, so the demo is a
// fair preview of the feature rather than filler.

import type { Analysis, PromptKey } from "./types"

const STOCK = `## NVDA in context

You hold NVDA across three accounts — Schwab Taxable, Fidelity BrokerageLink, and Robinhood — which is why it can be easy to under-count. Consolidated, it is your largest single-name position by market value and sits well above the next holding.

### Position sizing
The bulk of the position sits in the taxable account, so any trim there is a taxable event while the BrokerageLink lot is not. That split matters more than the headline weight: your effective flexibility to reduce exposure is smaller than the total suggests.

### Concentration
Combined with AMD and AVGO, semiconductor exposure is a meaningful share of your equity sleeve. These names do not move independently — a demand or export-control shock tends to hit all three at once, so treating them as three positions understates the correlated risk.

### What the data does not tell me
Cost basis is present for these lots, but nothing here reflects your time horizon, income needs, or holdings outside this app.

### What to watch
- Combined semiconductor weight, not the single-name weight
- Which lots are taxable vs. tax-advantaged before any rebalance
- Whether new contributions are quietly adding to the same theme
- Your total exposure through index funds (VOO, VTI, FXAIX all hold NVDA too)`

const PORTFOLIO = `## Portfolio review

Nine accounts, roughly thirty distinct tickers, spread across taxable, 401(k), Roth IRA, BrokerageLink, and a crypto account.

### Concentration comes first
The top handful of positions — led by mega-cap technology — account for a large share of total value. Index funds compound this rather than offsetting it: VOO, VTI, and FXAIX are each heavily weighted toward the same companies you also hold directly. Your true exposure to the largest names is higher than the individual rows suggest.

### Asset mix
Equities dominate. A small crypto sleeve (BTC, ETH, SOL, DOGE) adds volatility disproportionate to its weight. SCHD and the consumer-staples names (KO, PG) are the main ballast; there is no meaningful bond or cash allocation visible here.

### Account structure
Tax-advantaged accounts hold a large share of the growth-oriented positions, which limits your ability to harvest losses there. The taxable accounts carry more of the appreciated single names — the opposite of what a tax-aware placement would usually look like.

### What I cannot assess
Symbols without a live price are excluded from the total, so the real figure is higher than shown. Lots without a cost basis are excluded from gain/loss. Nothing here covers your income, horizon, or outside assets.

### Questions to ask yourself
- If I add my index-fund look-through, what is my actual exposure to the top five companies?
- Is the crypto sleeve sized to a loss I would accept in full?
- Am I comfortable holding the most appreciated names in taxable accounts?
- What is my intended bond or cash allocation, and why is it not here?
- Which of these positions would I buy again today at the current price?`

const RESEARCH = `## Researching a ticker you do not own

In live mode this returns a briefing on any symbol you enter — what the business does, how it makes money, the main risks, and what would have to be true for the thesis to work, alongside the current quote we fetch for it.

Two things the real version is careful about, and this demo is too:

### Knowledge has a cutoff
Anything remembered about revenue, margins, or valuation is dated by definition. The live version qualifies those figures rather than presenting them as current, and treats the fetched quote as the only genuinely current number available.

### No recommendation
It does not tell you to buy, sell, or hold, and it does not produce price targets. It describes the business and the risks and hands the decision back to you.

### What to verify
- The latest filing or earnings release for any figure that matters to you
- Whether you already hold the name indirectly through an index fund
- How it correlates with what you already own`

const CANNED: Record<PromptKey, { target: string; targetType: "symbol" | "portfolio"; content: string }> = {
  stock: { target: "NVDA", targetType: "symbol", content: STOCK },
  portfolio: { target: "ALL", targetType: "portfolio", content: PORTFOLIO },
  research: { target: "EXAMPLE", targetType: "symbol", content: RESEARCH },
}

/**
 * The canned response for a prompt. `target` is echoed back so a visitor who
 * typed a symbol sees it in the header, even though the body is fixed.
 */
export function demoAnalysis(key: PromptKey, target?: string): Analysis {
  const canned = CANNED[key]
  return {
    id: `demo-${key}`,
    targetType: canned.targetType,
    target: target?.toUpperCase() || canned.target,
    promptKey: key,
    model: "demo",
    content: canned.content,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    createdAt: new Date().toISOString(),
    isDemo: true,
  }
}
