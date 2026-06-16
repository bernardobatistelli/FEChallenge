// Take-home simplification: tables are created from raw DDL so the app runs
// with zero setup. In production we use drizzle-kit migrations.
//
// This DDL mirrors src/db/schema.ts column-for-column. If you change the
// schema, change it here too (or, in a real project, generate a migration).

import { sql } from "drizzle-orm";

import { db } from "./client";

export async function ensureSchema(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "workspaces" (
      "id"   text PRIMARY KEY NOT NULL,
      "slug" text NOT NULL UNIQUE,
      "name" text NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "users" (
      "id"           text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id"),
      "name"         text NOT NULL,
      "email"        text NOT NULL,
      "role"         text NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "jobs" (
      "id"           text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id"),
      "title"        text NOT NULL,
      "department"   text NOT NULL,
      "location"     text NOT NULL,
      "status"       text NOT NULL,
      "created_at"   timestamp NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "candidates" (
      "id"           text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id"),
      "name"         text NOT NULL,
      "email"        text NOT NULL,
      "phone"        text NOT NULL,
      "source"       text NOT NULL,
      "created_at"   timestamp NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "applications" (
      "id"           text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id"),
      "candidate_id" text NOT NULL REFERENCES "candidates"("id"),
      "job_id"       text NOT NULL REFERENCES "jobs"("id"),
      "stage"        text NOT NULL,
      "applied_at"   timestamp NOT NULL,
      "updated_at"   timestamp NOT NULL
    );
  `);
}
