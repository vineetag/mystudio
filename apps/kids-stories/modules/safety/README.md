# story-safety agent (app-level)

An LLM-powered agent that screens every generated story for age-appropriateness
**before it's shown to a child**. This is an *app-level* agent — it encodes
ZippyTales product/safety judgment, so it lives with the app rather than in the
shared open-source `agents/` folder.

## Why an LLM here (and not a static check)

Deciding whether prose is appropriate for a 3–9 year-old is a *fuzzy judgment*,
not a string match — exactly the case where an LLM earns its cost. (Contrast the
dev-workflow agents in `/agents`, which are deterministic on purpose.)

## How it works

1. `generateStory()` produces a story with a strict, safe system prompt and a
   refusal check — the first line of defense.
2. The API route then calls `screenStory()` (this module) as **defense in
   depth**, before persisting or returning the story.
3. `screenStory()` runs a second, cheap model pass via `lib/ai`'s
   `runStructuredModel` (so it inherits the **monthly spend cap** and usage
   logging), scoring the story across safety categories.
4. The pure `decideAction()` policy turns the verdict into `allow` / `block`.
   Blocking refunds the user's daily slot and returns a clear 422.

```
route → generateStory (lib/ai)        # create
route → screenStory   (this module)   # screen → allow | block
          └→ runStructuredModel (lib/ai)  # the only AI transport
```

No dependency cycle: `lib/ai` never imports this module; this module calls into
`lib/ai`. All AI usage stays in `lib/ai`, satisfying `@appcrafter/ai-cost-guard`.

## Files

| File | Responsibility |
|------|----------------|
| `policy.ts` | **Pure** rulebook: categories, severity levels, `decideAction`. Unit-testable, no AI. |
| `prompt.ts` | Safety system prompt + JSON schema + data-boundary wrapping. |
| `agent.ts` | Orchestrator: calls the model, parses/validates, applies policy. |
| `index.ts` | Public surface — import from here only. |

## Configuration (env vars)

| Var | Default | Effect |
|-----|---------|--------|
| `STORY_SAFETY_ENABLED` | auto | `false` disables everywhere; `true` forces on (even locally); unset = **on in production only**, off in local dev and Vercel preview. |
| `STORY_SAFETY_FAIL_MODE` | `closed` | If the screener errors, `closed` blocks (safe default for kids); `open` allows. |

## Cost note

Screening adds **one extra Haiku call per generated story** (capped at 512
output tokens). At Haiku pricing this is a fraction of a cent per story and still
counts against the monthly spend cap. Disable via `STORY_SAFETY_ENABLED=false`
if you need to trim cost in a low-risk environment.

## Tuning

- Raise/lower the bar in `policy.ts` (`BLOCK_AT_LEVEL`).
- Adjust categories or guidance in `prompt.ts`.
- Blocked stories are never persisted; `concerns`/`scores` are available on the
  returned verdict if you want to log them for admin review.
