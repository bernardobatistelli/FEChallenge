# Decisions

_Your write-up. Keep it brief — we're reading for trade-offs and reasoning, not
completeness. Delete these prompts as you fill them in._

## Overview

What you built and the state it's in. If something is half-done on purpose, say so —
that's a good answer, not a gap.

## Architecture & key decisions

- **Tool catalog** — which tools you added, their granularity, and how you shaped
  their inputs for a model to drive.
- **Query layer** — how it's structured and composed.
- **Tenant scoping** — how you made it impossible to forget as the layer grows.
- **Permissions** — how you enforce the PII rule by role.
- **Generative UI** — how tool results become streaming components.

## Model & agent

Which provider or gateway you wired (Vercel AI Gateway / Cloudflare AI Gateway /
direct keys / Bedrock), and **why**. Anything notable about the loop — multi-step
control, tool-error handling, stop strategy, structured output.

## Benchmarks

What your tenant-isolation and permission checks actually assert, and how you know
they catch the real thing.

## Trade-offs & cuts

What you deliberately left out and why. What you'd do with another day.

## Working with the agent

Using AI tools is encouraged. Briefly:

- What you delegated.
- Where the agent was wrong and you caught it.
- What you'd never let it decide on its own.

## Hours

Roughly how long you spent.
