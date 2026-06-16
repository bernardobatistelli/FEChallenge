import { tool } from "ai";
import { z } from "zod";

import { applicationCountByStage, type AnalyticsCtx } from "@/db/analytics";
import type { Display, ToolResult } from "./artifact";

/**
 * The copilot's tool catalog — what the agent can actually do.
 *
 * This ships with ONE worked example. Designing the rest of the catalog is the
 * heart of the exercise: which tools should exist, their granularity, how their
 * inputs are shaped for a model to fill, and what each returns for the UI.
 *
 * The agent picks tools and passes high-level params — it never writes SQL.
 * Pass `ctx` to every query so results stay scoped to this workspace, and gate
 * PII by `ctx.role` (see src/db/permissions.ts). Each tool returns
 * `{ rows, display }` — see src/agent/artifact.ts.
 */
export function buildTools(ctx: AnalyticsCtx) {
  const result = (rows: ToolResult["rows"], display: Display): ToolResult => ({
    rows,
    display,
  });

  return {
    // REFERENCE TOOL — a scoped query + typed input + a display hint the UI
    // renders. Use it as the template for the tools you add.
    applicationCountByStage: tool({
      description:
        "Count applications grouped by pipeline stage (applied, screen, interview, offer, hired, rejected). Pass a jobId to scope to one job.",
      inputSchema: z.object({ jobId: z.string().optional() }),
      async execute({ jobId }) {
        const rows = await applicationCountByStage(ctx, { jobId });
        return result(rows, {
          kind: "bar",
          x: "stage",
          y: "count",
          title: "Applications by stage",
        });
      },
    }),

    // TODO(candidate): design and add the tools that make this a genuinely
    // useful analytics copilot for this workspace's recruiting data.
  };
}

export type CopilotTools = ReturnType<typeof buildTools>;
