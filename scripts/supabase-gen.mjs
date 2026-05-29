import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const outputPath = resolve(root, "src/types/supabase.type.ts");

function parseDotEnv(contents) {
  const env = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^(?:export\s+)?([\w.-]+)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const dotEnv = existsSync(envPath) ? parseDotEnv(readFileSync(envPath, "utf8")) : {};
const env = { ...process.env, ...dotEnv };
const dbUrl = env.DB_URL;

if (!dbUrl) {
  console.error("DB_URL is missing. Add it to .env or your environment.");
  process.exit(1);
}

mkdirSync(dirname(outputPath), { recursive: true });

const supabaseBins =
  process.platform === "win32"
    ? [
        resolve(root, "node_modules/supabase/bin/supabase.exe"),
        "supabase.exe",
        "supabase",
      ]
    : [resolve(root, "node_modules/supabase/bin/supabase"), "supabase"];

const supabaseBin = supabaseBins.find((bin) => !bin.includes("node_modules") || existsSync(bin));
const args = ["gen", "types", "typescript", "--db-url", dbUrl, "--schema", "public"];
let child;

try {
  child = spawn(supabaseBin, args, {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "inherit"],
  });
} catch (error) {
  console.error(`Failed to run Supabase CLI: ${error.message}`);
  process.exit(1);
}

const chunks = [];

child.on("error", (error) => {
  console.error(`Failed to run Supabase CLI: ${error.message}`);
  process.exit(1);
});

child.stdout.on("data", (chunk) => {
  chunks.push(chunk);
});

child.on("close", (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  writeFileSync(outputPath, Buffer.concat(chunks));
});
