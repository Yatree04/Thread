import "dotenv/config";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

function expandHome(p) {
  if (!p) return p;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

function existingPaths(paths) {
  return [...new Set(paths.map(expandHome))].filter((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });
}

export const dataDir = path.join(import.meta.dirname, "..", "data");
export const storePath = path.join(dataDir, "store.json");
export const googleTokenPath = path.join(dataDir, "google-token.json");

export const config = {
  port: Number(process.env.PORT) || 4127,
  oauthPort: Number(process.env.OAUTH_PORT) || 4128,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  watchPaths: existingPaths(
    [process.env.WATCH_DOWNLOADS, process.env.WATCH_DESKTOP, process.env.WATCH_SCREENSHOTS].filter(Boolean)
  ),
};

export function hasAnthropicKey() {
  return Boolean(config.anthropicApiKey);
}

export function hasGoogleCredentials() {
  return Boolean(config.googleClientId && config.googleClientSecret);
}

fs.mkdirSync(dataDir, { recursive: true });
