/**
 * Eval harness (run via `pnpm eval` → tsx evals/run.ts).
 *
 * These evals assert things that matter about AGENT BEHAVIOR — tenant
 * isolation, permissions, grounding — not just unit correctness. They run fully
 * offline against the deterministic mock model and print a scorecard.
 *
 * Writing real benchmarks is a core part of this exercise. The example below is
 * complete and shows the pattern (drive the agent, then inspect `result.steps`
 * and the tool RESULTS the agent produced). The two checks after it are stubs
 * for you to make real — they print as `todo`, not as passing.
 */
import { db, ensureSchema } from "@/db/client";
import { workspaces } from "@/db/schema";
import { seed } from "@/db/seed";
import { streamCopilot } from "@/agent/run";
import type { UIMessage } from "ai";

function userMessage(text: string): UIMessage {
  return { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text }] };
}

async function ensureSeeded() {
  await ensureSchema();
  const rows = await db.select().from(workspaces);
  if (rows.length === 0) await seed();
}

type Status = "pass" | "fail" | "todo";
type Check = { name: string; status: Status; detail: string };
const checks: Check[] = [];
function record(name: string, status: Status, detail = "") {
  checks.push({ name, status, detail });
}

/** Flatten the tool RESULTS the agent produced across every step. */
type StepLike = {
  toolResults: Array<{ toolName: string; output?: unknown }>;
};

function toolResults(
  steps: StepLike[],
): Array<{ toolName: string; output: unknown }> {
  return steps.flatMap((step) =>
    step.toolResults.map((r) => ({ toolName: r.toolName, output: r.output })),
  );
}

// ---------------------------------------------------------------------------
// EXAMPLE EVAL — the mock model drives real tool calls through streamText; the
// agent produces non-empty closing text; and we read structured rows back out
// of a tool result. This is the pattern the two checks below build on.
// ---------------------------------------------------------------------------
async function exampleEval() {
  const result = await streamCopilot({
    workspaceId: "brightwave",
    role: "admin",
    messages: [userMessage("How does my pipeline look by stage?")],
  });

  const [steps, text] = await Promise.all([result.steps, result.text]);

  const totalToolCalls = steps.reduce((n, s) => n + s.toolCalls.length, 0);
  record(
    "example: agent calls at least one tool",
    totalToolCalls > 0 ? "pass" : "fail",
    `${totalToolCalls} call(s) across ${steps.length} step(s)`,
  );

  record(
    "example: agent produces non-empty final text",
    text.trim().length > 0 ? "pass" : "fail",
    JSON.stringify(text.slice(0, 50)),
  );

  const stageResult = toolResults(steps).find(
    (r) => r.toolName === "applicationCountByStage",
  );
  const rows =
    (stageResult?.output as { rows?: Array<{ count: number }> } | undefined)
      ?.rows ?? [];
  record(
    "example: stage breakdown returns rows",
    rows.length > 0 ? "pass" : "fail",
    `${rows.length} stage(s)`,
  );
}

// ---------------------------------------------------------------------------
// TODO(candidate): TENANT-ISOLATION BENCHMARK
//
// Tenant scoping is a hard requirement: the agent must NEVER surface data from
// another workspace — for EVERY tool you build, not just the reference one.
//
// One way to make it real:
//   1. Run the copilot for "brightwave" with questions that exercise your tools.
//   2. Pull each tool result from `result.steps`.
//   3. Cross-check against the TRUSTED scoped data (call your analytics fns
//      directly with { workspaceId: "brightwave", role: "admin" }) and assert
//      the agent never returned a row belonging to another workspace. For
//      aggregates, comparing totals is an easy first cut.
// ---------------------------------------------------------------------------
async function tenantIsolationEval() {
  record(
    "tenant isolation: agent never returns another workspace's data",
    "todo",
    "implement against the tools you build",
  );
}

// ---------------------------------------------------------------------------
// TODO(candidate): PERMISSION BENCHMARK
//
// Permissions are a hard requirement: an `analyst` must never receive candidate
// PII (name / email / phone) from any tool. Today nothing enforces this (see
// src/db/permissions.ts `canReadColumn`).
//
// One way to make it real: build your tools for an analyst
// (`buildTools({ workspaceId: "brightwave", role: "analyst" })`), call a tool
// that exposes candidate-level data, and assert no returned row contains PII.
// ---------------------------------------------------------------------------
async function permissionEval() {
  record(
    "permissions: analyst never receives candidate PII",
    "todo",
    "implement against the tools you build",
  );
}

function icon(status: Status): string {
  return status === "pass" ? "✅" : status === "fail" ? "❌" : "🔲";
}

async function main() {
  await ensureSeeded();
  await exampleEval();
  await tenantIsolationEval();
  await permissionEval();

  console.log("\nAgent benchmark scorecard");
  console.log("─".repeat(64));
  for (const c of checks) {
    console.log(`${icon(c.status)} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  const pass = checks.filter((c) => c.status === "pass").length;
  const fail = checks.filter((c) => c.status === "fail").length;
  const todo = checks.filter((c) => c.status === "todo").length;
  console.log("─".repeat(64));
  console.log(
    `${pass}/${pass + fail} implemented checks passing · ${todo} TODO to build`,
  );

  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Eval runner crashed:", err);
  process.exit(1);
});
