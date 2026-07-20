import { describe, expect, it } from "vitest"
import { renderTemplate, templateVars } from "./template"

describe("renderTemplate", () => {
  it("substitutes known placeholders", () => {
    expect(renderTemplate("Analyze {{symbol}}.", { symbol: "NVDA" })).toBe("Analyze NVDA.")
  })

  it("tolerates whitespace inside the braces", () => {
    expect(renderTemplate("{{ symbol }}", { symbol: "AAPL" })).toBe("AAPL")
  })

  it("substitutes every occurrence", () => {
    expect(renderTemplate("{{symbol}} and {{symbol}}", { symbol: "KO" })).toBe("KO and KO")
  })

  it("leaves unknown placeholders visible rather than blanking them", () => {
    // A silently-emptied placeholder would ship a broken prompt with no signal.
    expect(renderTemplate("a {{typo}} b", { symbol: "X" })).toBe("a {{typo}} b")
  })

  it("leaves known placeholders alone when no value is supplied", () => {
    expect(renderTemplate("{{symbol}}", {})).toBe("{{symbol}}")
  })
})

describe("templateVars", () => {
  it("lists the distinct placeholders a template uses, sorted", () => {
    expect(templateVars("{{symbol}} {{context}} {{symbol}}")).toEqual(["context", "symbol"])
  })

  it("returns an empty list for a template with no placeholders", () => {
    expect(templateVars("no vars here")).toEqual([])
  })
})
