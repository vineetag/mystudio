import { parseMarkdown, type InlineSpan } from "@/modules/ai/markdown"

function Spans({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((span, index) =>
        span.bold ? (
          <strong key={index} className="font-semibold text-ink">
            {span.text}
          </strong>
        ) : (
          <span key={index}>{span.text}</span>
        ),
      )}
    </>
  )
}

/**
 * Renders analysis text. The model's markdown is parsed to a block tree and
 * emitted as JSX — never as an HTML string — so there is no injection surface
 * even though the copy originates from a model.
 */
export function AnalysisMarkdown({ content }: { content: string }) {
  const blocks = parseMarkdown(content)

  return (
    <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-ink/80">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return block.level === 2 ? (
            <h3 key={index} className="mt-2 text-lg font-semibold text-ink">
              <Spans spans={block.spans} />
            </h3>
          ) : (
            <h4 key={index} className="mt-1 text-sm font-semibold tracking-wide text-ink">
              <Spans spans={block.spans} />
            </h4>
          )
        }

        if (block.type === "list") {
          return (
            <ul key={index} className="flex list-disc flex-col gap-1.5 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Spans spans={item} />
                </li>
              ))}
            </ul>
          )
        }

        return (
          <p key={index}>
            <Spans spans={block.spans} />
          </p>
        )
      })}
    </div>
  )
}
