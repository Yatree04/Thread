import express from "express";
import cors from "cors";
import { config, hasAnthropicKey, hasGoogleCredentials } from "./config.js";
import { router } from "./api.js";
import { startWatcher } from "./watcher.js";
import { sweepDormant } from "./store.js";

const app = express();
app.use(cors()); // local-only server (127.0.0.1); open CORS is fine here, nothing is exposed beyond localhost.
app.use(express.json());
app.use(router);

app.listen(config.port, "127.0.0.1", () => {
  console.log(`\nThread companion running at http://127.0.0.1:${config.port}`);
  console.log(`  Anthropic classification: ${hasAnthropicKey() ? "on" : "off (set ANTHROPIC_API_KEY in .env)"}`);
  console.log(`  Google Calendar:          ${hasGoogleCredentials() ? "configured" : "off (set GOOGLE_CLIENT_ID/SECRET in .env)"}`);
  console.log(`  Watching:                 ${config.watchPaths.join(", ") || "(no folders found — check .env)"}\n`);
});

startWatcher();
setInterval(() => sweepDormant(), 1000 * 60 * 30);
