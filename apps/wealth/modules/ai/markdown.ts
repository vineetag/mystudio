// Minimal markdown parser for analysis output. Pure — unit-tested.
//
// Deliberately not a general markdown library: the prompts ask for exactly four
// constructs (## / ### headings, - lists, paragraphs, **bold**), so a ~50-line
// parser we control beats a dependency. Output is a block tree the renderer
// turns into JSX — no HTML string is ever produced, so there is nothing to
// sanitize and no injection surface.

export type InlineSpan = { text: string; bold: boolean }

export type MarkdownBlock =
  | { type: "heading"; level: 2 | 3; spans: InlineSpan[] }
  | { type: "paragraph"; spans: InlineSpan[] }
  | { type: "list"; items: InlineSpan[][] }

const BOLD = /\*\*(.+?)\*\*/g

/** Splits a line into bold/plain runs. Unmatched `**` stays literal. */
export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = []
  let cursor = 0

  for (const match of text.matchAll(BOLD)) {
    const start = match.index ?? 0
    if (start > cursor) spans.push({ text: text.slice(cursor, start), bold: false })
    spans.push({ text: match[1], bold: true })
    cursor = start + match[0].length
  }
  if (cursor < text.length) spans.push({ text: text.slice(cursor), bold: false })

  return spans.length > 0 ? spans : [{ text, bold: false }]
}

export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  let paragraph: string[] = []
  let listItems: InlineSpan[][] = []

  function flushParagraph() {
    if (paragraph.length === 0) return
    blocks.push({ type: "paragraph", spans: parseInline(paragraph.join(" ")) })
    paragraph = []
  }

  function flushList() {
    if (listItems.length === 0) return
    blocks.push({ type: "list", items: listItems })
    listItems = []
  }

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim()

    if (line.length === 0) {
      flushParagraph()
      flushList()
      continue
    }

    const heading = /^(#{2,3})\s+(.*)$/.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({
        type: "heading",
        level: heading[1].length === 2 ? 2 : 3,
        spans: parseInline(heading[2]),
      })
      continue
    }

    const item = /^[-*]\s+(.*)$/.exec(line)
    if (item) {
      flushParagraph()
      listItems.push(parseInline(item[1]))
      continue
    }

    // A plain line inside a list ends the list — the model never wraps items.
    flushList()
    paragraph.push(line)
  }

  flushParagraph()
  flushList()
  return blocks
}
