import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { config as loadEnv } from "dotenv";

function collectEnvPaths(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const add = (p: string): void => {
    const n = join(p);
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  };

  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
        if (pkg.name === "ride") {
          add(join(dir, ".env"));
        }
      } catch {
        /* ignore invalid package.json */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  add(join(process.cwd(), ".env"));
  add(join(process.cwd(), "Micoach-BE", ".env"));

  return out;
}

// Load every candidate so nested configs win over parent folders (override: true).
for (const path of collectEnvPaths()) {
  if (existsSync(path)) {
    loadEnv({ path, override: true });
  }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) {
    const hint =
      "Copy Micoach-BE/.env.example to Micoach-BE/.env and set MONGODB_URI and JWT_SECRET " +
      "(see Micoach-BE/README). If .env exists, those keys must be non-empty.";
    throw new Error(`Missing required environment variable: ${name}. ${hint}`);
  }
  return v.trim();
}

const parsedOrigins = (process.env.CLIENT_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const defaultDevOrigins = ["http://localhost:5173", "http://localhost:8081"];

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT) || 4000,
  mongodbUri: required("MONGODB_URI"),
  jwtSecret: required("JWT_SECRET"),
  /** Optional absolute API origin for file URLs in JSON (e.g. https://api.example.com) */
  apiPublicUrl: process.env.API_PUBLIC_URL?.trim() || undefined,
  clientOrigins:
    parsedOrigins.length > 0
      ? parsedOrigins
      : (process.env.NODE_ENV ?? "development") !== "production"
        ? defaultDevOrigins
        : [],
};
