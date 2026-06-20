# Spec 00 — Real OpenAI agent

**Status:** Draft · **Depends on:** — · **Estimate:** ~30m

## Goal
The copilot runs against a real OpenAI model with a system prompt that drives tools well and
declines gracefully, replacing the boot-only mock. The mock stays the default for tests.

## Contract
- **Env** (`.env.local`, gitignored — loaded by `next dev`, not by vitest/evalite):
  ```
  AI_PROVIDER=openai
  OPENAI_MODEL=gpt-4o-mini
  OPENAI_API_KEY=…
  ```
- **Test determinism** (`vitest.config.ts`): pin `test.env = { AI_PROVIDER: "mock" }` so unit
  tests never hit a real API even if the shell exports `AI_PROVIDER=openai`.
- **`SYSTEM_PROMPT`** (`src/agent/provider.ts`) gains these behaviors (keep the existing
  scope/PII/prompt-injection rules):
  - No tool fits → say so plainly; never fabricate numbers/names/sources/trends.
  - A tool fails → say it couldn't be retrieved; offer what *can* be answered.
  - Role hides data (analyst + PII) → answer with what's visible, note the detail is
    restricted for this role, never invent the hidden values.
- **Loop** (`src/agent/run.ts`): add `onError` to `streamText` so a tool/stream failure is
  surfaced (logged) instead of crashing the turn. Keep `stopWhen: stepCountIs(6)`.

## In scope
The four bullets above.

## Out of scope
New tools, query layer, UI, evals. (Per-tool structured error results land in Spec 02.)

## Acceptance
- [ ] `pnpm test` still passes on the mock (no network).
- [ ] With a real key, `pnpm dev` → "how does my pipeline look by stage?" → gpt-4o-mini calls
      the reference tool and streams a grounded answer.
- [ ] Asking something with no matching tool yields an honest "I can't answer that," not a
      fabricated number.

## Files
`.env.local`, `vitest.config.ts`, `src/agent/provider.ts`, `src/agent/run.ts`
