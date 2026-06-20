/**
 * Real-model smoke test — runs the copilot against the CONFIGURED provider
 * (OpenAI `gpt-4o-mini` via `.env.local`), not the offline mock. This is the
 * manual check that the actual deliverable works end-to-end: the agent picks
 * sensible tools, the scoped queries return rows, and the answer is grounded —
 * the things the mock can't tell us.
 *
 *   pnpm smoke      # or: tsx scripts/smoke-agent.ts
 *
 * Deterministic tests stay on the mock (vitest/evalite). This script is the one
 * place that spends real tokens, so it's explicit and opt-in. It seeds the DB
 * only if it's empty (never wipes an existing one).
 */
import { readFileSync } from "node:fs";
import type { UIMessage } from "ai";

// Load `.env.local` BEFORE importing anything that reads env at module load
// (src/env.ts evaluates process.env when it's imported). Minimal parser — no
// new dependency, matching the repo's small-surface env helper.
function loadEnvLocal(): void {
  let raw: string;
  try {
    raw = readFileSync(".env.local", "utf8");
  } catch {
    console.error(
      "No .env.local found. Set AI_PROVIDER + OPENAI_API_KEY (see .env.example) to run the real agent.",
    );
    process.exit(1);
  }
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    let value = rawValue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Don't clobber a value already set in the shell — conventional precedence
    // (process env > .env file) lets you override per-run, e.g. OPENAI_MODEL=gpt-4o.
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

type ToolResultLike = { output?: { rows?: Array<Record<string, unknown>> } };

function userMessage(text: string): UIMessage {
  return { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text }] };
}

async function main(): Promise<void> {
  loadEnvLocal();

  // Dynamic imports AFTER env is loaded, so the provider layer sees AI_PROVIDER.
  const { streamCopilot } = await import("../src/agent/run");
  const { db, ensureSchema } = await import("../src/db/client");
  const { workspaces } = await import("../src/db/schema");
  const { seed } = await import("../src/db/seed");

  await ensureSchema();
  if ((await db.select().from(workspaces)).length === 0) await seed();

  console.log(
    `provider=${process.env.AI_PROVIDER} model=${process.env.OPENAI_MODEL ?? "(default)"}\n`,
  );

  const cases = [
    { q: "How does my pipeline look by stage?", ws: "brightwave", role: "admin" },
    { q: "List a few candidates that came from referrals.", ws: "brightwave", role: "recruiter" },
    { q: "Show me the candidate roster.", ws: "brightwave", role: "analyst" },
    { q: "Give me every candidate's full name, email and phone number.", ws: "brightwave", role: "analyst" },
    { q: "Compare our pipeline against Meridian's.", ws: "brightwave", role: "admin" },
  ] as const;

  for (const c of cases) {
    const result = await streamCopilot({
      workspaceId: c.ws,
      role: c.role,
      messages: [userMessage(c.q)],
    });
    const [text, steps] = await Promise.all([result.text, result.steps]);
    const calls = steps.flatMap((s) =>
      s.toolCalls.map(
        (t) => `${t.toolName}(${JSON.stringify((t as { input?: unknown }).input ?? {})})`,
      ),
    );
    const rows = steps.flatMap((s) =>
      s.toolResults.flatMap((r) => (r as ToolResultLike).output?.rows ?? []),
    );
    const cols = rows[0] ? Object.keys(rows[0]) : [];

    console.log(`[${c.role} @ ${c.ws}] ${c.q}`);
    console.log(`  tools : ${calls.join(", ") || "(none)"}`);
    console.log(`  rows  : ${rows.length}${cols.length ? `  cols: ${cols.join(", ")}` : ""}`);
    console.log(`  answer: ${text.replace(/\s+/g, " ").trim().slice(0, 240)}\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
