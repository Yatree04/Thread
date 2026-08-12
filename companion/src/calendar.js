import fs from "node:fs";
import http from "node:http";
import { google } from "googleapis";
import { config, googleTokenPath, hasGoogleCredentials } from "./config.js";
import { updateTodo } from "./store.js";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const REDIRECT_URI = `http://127.0.0.1:${config.oauthPort}/oauth2callback`;

function newOAuthClient() {
  return new google.auth.OAuth2(config.googleClientId, config.googleClientSecret, REDIRECT_URI);
}

function loadSavedClient() {
  if (!hasGoogleCredentials() || !fs.existsSync(googleTokenPath)) return null;
  const client = newOAuthClient();
  client.setCredentials(JSON.parse(fs.readFileSync(googleTokenPath, "utf-8")));
  return client;
}

export function isCalendarConnected() {
  return Boolean(loadSavedClient());
}

// Kicks off the "installed app" OAuth flow: spin up a one-shot local server
// to catch Google's redirect, return the URL the user needs to open.
let pendingServer = null;

export function beginAuth() {
  if (!hasGoogleCredentials()) {
    throw new Error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in companion/.env first.");
  }
  const client = newOAuthClient();
  const authUrl = client.generateAuthUrl({ access_type: "offline", scope: SCOPES, prompt: "consent" });

  if (pendingServer) pendingServer.close();
  pendingServer = http.createServer(async (req, res) => {
    const url = new URL(req.url, REDIRECT_URI);
    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404).end();
      return;
    }
    const code = url.searchParams.get("code");
    try {
      const { tokens } = await client.getToken(code);
      fs.writeFileSync(googleTokenPath, JSON.stringify(tokens, null, 2));
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<body style='font-family:sans-serif;padding:40px'><h2>Google Calendar connected.</h2>You can close this tab and go back to Thread.</body>");
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(`<body style='font-family:sans-serif;padding:40px'>Auth failed: ${err.message}</body>`);
    } finally {
      pendingServer.close();
      pendingServer = null;
    }
  });
  pendingServer.listen(config.oauthPort);

  return authUrl;
}

export async function createEventForTodo(todo) {
  const client = loadSavedClient();
  if (!client || !todo.due?.iso) return null;

  const calendar = google.calendar({ version: "v3", auth: client });
  const start = new Date(todo.due.iso);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const { data } = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: todo.text,
      description: "Added automatically by Thread.",
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  });

  updateTodo(todo.id, { calendarEventId: data.id });
  return data;
}

export async function listTodayEvents() {
  const client = loadSavedClient();
  if (!client) return [];

  const calendar = google.calendar({ version: "v3", auth: client });
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const { data } = await calendar.events.list({
    calendarId: "primary",
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  return (data.items || []).map((e) => ({
    id: e.id,
    title: e.summary || "(untitled event)",
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date,
  }));
}
