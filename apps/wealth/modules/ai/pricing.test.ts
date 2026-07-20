import { describe, expect, it } from "vitest"
import { costUsd, estimateCost, estimateTokens, isModelTier, MODELS } from "./pricing"

describe("estimateTokens", () => {
  it("returns 0 for empty text", () => {
    expect(estimateTokens("")).toBe(0)
  })

  it("rounds up so an estimate never under-quotes", () => {
    expect(estimateTokens("a")).toBe(1)
    expect(estimateTokens("a".repeat(19))).toBe(10)
    expect(estimateTokens("a".repeat(20))).toBe(11)
  })

  it("assumes dense numeric context, not prose", () => {
    // Measured against the real portfolio: a prose-calibrated 3.6 chars/token
    // under-quoted our ticker/number context blocks by 88%. The fallback must
    // stay pessimistic — it only runs when the exact count is unavailable.
    const contextLine = "- NVDA (NVIDIA Corporation) | qty 41 | price 187.22 | value 7676.02"
    expect(estimateTokens(contextLine)).toBeGreaterThan(contextLine.length / 3.6)
  })
})

describe("costUsd", () => {
  it("prices input and output at their separate rates", () => {
    // Haiku: $1/MTok in, $5/MTok out.
    expect(costUsd("fast", 1_000_000, 0)).toBe(1)
    expect(costUsd("fast", 0, 1_000_000)).toBe(5)
    expect(costUsd("fast", 1_000_000, 1_000_000)).toBe(6)
  })

  it("keeps sub-cent runs from rounding away to zero", () => {
    const cost = costUsd("fast", 2_000, 500)
    expect(cost).toBeGreaterThan(0)
    expect(cost).toBeCloseTo(0.0045, 6)
  })

  it("prices a deep run above a fast one for identical usage", () => {
    expect(costUsd("deep", 10_000, 1_000)).toBeGreaterThan(costUsd("fast", 10_000, 1_000))
  })
})

describe("estimateCost", () => {
  it("quotes the worst case — every allowed output token", () => {
    const estimate = estimateCost("fast", 1_000, 1_000)
    expect(estimate.inputTokens).toBe(1_000)
    expect(estimate.maxOutputTokens).toBe(1_000)
    // 1000 in @ $1/MTok + 1000 out @ $5/MTok
    expect(estimate.maxCostUsd).toBeCloseTo(0.006, 6)
  })

  it("reports the exact model id that would be billed", () => {
    expect(estimateCost("standard", 500, 100).modelId).toBe(MODELS.standard.id)
  })
})

describe("isModelTier", () => {
  it("accepts the three tiers and rejects anything else", () => {
    expect(isModelTier("fast")).toBe(true)
    expect(isModelTier("deep")).toBe(true)
    expect(isModelTier("gpt")).toBe(false)
  })
})
