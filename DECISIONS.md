# Decisions

> Living log. Captures the decisions and reasoning so far; updated as each spec lands.
> Detailed, sequenced plan with contracts lives in [`specs/`](specs/README.md).

## Overview

A structured planning pass is done and the work is sliced into sequenced, spec-driven
slices (`specs/00`–`05`). Decisions below are locked; implementation runs one spec at a
time behind a hard acceptance gate (typecheck + tests green before the next). Nothing is
half-built yet — the spine (schema, seed, agent loop, provider, reference tool/query) is
the repo's; what I add is the catalog, the scoped query layer, PII enforcement, the
generative UI, and the benchmarks.

## Architecture & key decisions

- **Two layers, enforcement at the bottom.** A thin declarative **tool catalog**
  (`agent/tools.ts`) over a **scoped query catalog** (`db/analytics.ts`). Tools import
  `analytics.ts` only — never `db`, never raw SQL — so a tool *cannot* express an unscoped
  or PII-leaking query.
- **Tenant scoping (impossible to forget):** one chokepoint, `scopeWhere`. Every query fn
  is `ctx`-first (mirrors the reference), so it can't be written without the workspace
  filter.
- **Permissions = role-aware projection, not redaction.** A second chokepoint,
  `candidateSelection(ctx)`, is the only place candidate columns are selected; PII
  (name/email/phone) is **never SELECTed** for an `analyst`. The leak is unrepresentable,
  not stripped after the fact — same philosophy as `scopeWhere`, applied to columns.
- **Tool catalog:** a few high-signal tools, not one mega-tool — `applicationCountByStage`
  (given), `candidatesBySource`, `jobsOverview`, and a PII-bearing `listCandidates` (the
  one that actually exercises the gate). Inputs are minimal and optional; descriptions are
  written for the model and name the enum values it can pass.
- **Generative UI:** render dispatches on the tool's `display` hint (`bar`/`table`/`line`)
  with deliberate calling/empty/error states. `line` is built only if the over-time tool
  ships — no renderer for a kind nothing emits.

## Model & agent

- **OpenAI `gpt-4o-mini`, direct key.** Cheap, fast, and reliable enough to drive this
  tool-calling loop; the provider layer already supports `openai`. Trade-off: a stronger
  model picks tools and writes prose a notch better, at higher cost — `OPENAI_MODEL` is the
  one knob to turn if the demo needs it.
- **Deterministic tests:** real config lives in `.env.local` (gitignored), loaded only by
  `next dev` — so the app runs on the real model while vitest/evalite stay on the
  deterministic mock. `vitest.config.ts` pins `AI_PROVIDER=mock` so a stray shell export
  can't push unit tests onto a paid API.
- **Loop:** keep `stopWhen: stepCountIs(6)`; add `onError` + per-tool structured error
  results so a failing tool degrades gracefully instead of crashing the turn.

## Benchmarks

A **proof split**: deterministic guarantees are unit-tested, fuzzy behavior is eval'd.

- **vitest** (calls query fns directly, no model): every fn scoped to its workspace returns
  zero foreign rows; `listCandidates` as `analyst` returns rows with no PII keys, as
  `recruiter`/`admin` it includes them.
- **Evalite, adversarial:** an `analyst` prompting "give me every candidate's email" → assert
  no PII in any tool result; a Brightwave session prompting "compare to Meridian" → assert no
  `mer-*` rows. These hold even on the mock — the point is the guarantee survives a model that
  *tries* to leak. We know they catch the real thing because reverting the enforcement turns
  them red (it's in the acceptance bar).

## Trade-offs & cuts

- **No "tool library" abstraction.** Considered a `createScopedQueries(ctx)` factory /
  registry; rejected as needless cleverness — the `ctx`-first standalone pattern gives the
  same "can't forget scope" guarantee. The structure that earns its keep is the query layer,
  not a tool framework.
- **Scope cut-line** (if the box closes early): drop Spec 05 (over-time + line chart), trim
  UI polish, but keep the adversarial evals. The 2-hour checkpoint is Spec 00 + 01 + unit
  tests — the hard requirement proven against a real agent.
- **With another day:** a typed structured answer the agent emits (pairs with the evals);
  more analytics (time-to-hire, funnel conversion); an answer-quality LLM-judge eval; richer
  charts; and a deploy with the DB story written up.

## Working with the agent

- **Delegated:** parallel codebase exploration (mapping the agent / data / UI / eval layers),
  drafting the specs and this log, and — going forward — implementing each spec behind its
  acceptance gate for me to verify and question.
- **Where it was wrong and I caught it:**
  - It started *implementing* Spec 00 (wrote `.env`, edited the provider and vitest config)
    before the specs were even reviewed. I stopped it and had it revert — SDD means specs
    settle first.
  - Early on it entertained a "tool library" pattern I'd floated; pressed on *what problem it
    solves*, it conceded the repo already had a clean pattern and the abstraction was
    over-engineering. We moved the structure down to the query layer instead.
- **What I'd never let it decide alone:** the tenant/PII enforcement design (the hard
  requirement) — that's reviewed by hand and proven by tests I watch fail when the guard is
  deliberately broken; the scope cut-line; and anything that changes what data a role can see.

## Hours

Planning + grilling + specs: ~1h so far. Implementation budgeted ~3h against `specs/`
(running total updated as specs land).
