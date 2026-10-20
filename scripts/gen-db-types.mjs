#!/usr/bin/env node
/**
 * Regenerates src/lib/db/database.types.ts after a schema change. The project id comes from
 * SUPABASE_PROJECT_ID (the shell or .env.local; see .env.example), defaulting to the test project, so the id lives in
 * one place instead of inside a package.json script. Needs the Supabase CLI and a login
 * (`supabase login`, or SUPABASE_ACCESS_TOKEN).
 */
import { spawnSync } from "node:child_process";
import { renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Next.js keeps local settings in .env.local; load it (values already in the shell win) so a
// project id set only there is not silently replaced by the default below.
try {
  process.loadEnvFile(join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), ".env.local"));
} catch {
  // No .env.local: the shell environment and the default apply.
}
const project = process.env.SUPABASE_PROJECT_ID || "wjxvingpfbfvkfqhrguj";
const out = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "src/lib/db/database.types.ts");
const r = spawnSync("supabase", ["gen", "types", "typescript", "--project-id", project, "--schema", "public"], { encoding: "utf8", shell: process.platform === "win32" });
if (r.status !== 0) {
  console.error(r.stderr || "supabase gen types failed (is the Supabase CLI installed and logged in?)");
  process.exit(r.status ?? 1);
}
// Written only after the command succeeded, so a failure never empties the file.
writeFileSync(out + ".tmp", r.stdout);
renameSync(out + ".tmp", out);
console.log(`ok  - wrote ${out} from ${project}`);
