import { describe, expect, it } from "vitest"
import { parseInline, parseMarkdown } from "./markdown"

describe("parseInline", () => {
  it("returns a single plain span for text with no bold", () => {
    expect(parseInline("hello")).toEqual([{ text: "hello", bold: false }])
  })

  it("splits bold runs out of the surrounding text", () => {
    expect(parseInline("a **b** c")).toEqual([
      { text: "a ", bold: false },
      { text: "b", bold: true },
      { text: " c", bold: false },
    ])
  })

  it("leaves an unmatched marker literal", () => {
    expect(parseInline("2 ** 3")).toEqual([{ text: "2 ** 3", bold: false }])
  })
})

describe("parseMarkdown", () => {
  it("parses headings at both levels", () => {
    const blocks = parseMarkdown("## Top\n\n### Sub")
    expect(blocks).toEqual([
      { type: "heading", level: 2, spans: [{ text: "Top", bold: false }] },
      { type: "heading", level: 3, spans: [{ text: "Sub", bold: false }] },
    ])
  })

  it("joins wrapped paragraph lines into one block", () => {
    const blocks = parseMarkdown("one\ntwo\n\nthree")
    expect(blocks).toEqual([
      { type: "paragraph", spans: [{ text: "one two", bold: false }] },
      { type: "paragraph", spans: [{ text: "three", bold: false }] },
    ])
  })

  it("groups consecutive bullets into one list", () => {
    const blocks = parseMarkdown("- a\n- b")
    expect(blocks).toEqual([
      {
        type: "list",
        items: [[{ text: "a", bold: false }], [{ text: "b", bold: false }]],
      },
    ])
  })

  it("ends a list when prose follows it", () => {
    const blocks = parseMarkdown("- a\nafter")
    expect(blocks.map((block) => block.type)).toEqual(["list", "paragraph"])
  })

  it("returns nothing for empty or whitespace-only input", () => {
    expect(parseMarkdown("")).toEqual([])
    expect(parseMarkdown("\n\n  \n")).toEqual([])
  })
})
