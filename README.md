# Thread

Thread quietly groups your files, browser tabs, downloads, and to-dos into activity-based **Threads**, and reopens everything for you in one click.

This is the real, working version — a background service that watches your actual filesystem and browser, calls Claude to do real classification, and syncs to-dos to Google Calendar. (There's also a separate, purely visual [design-prototype](../../pull/1) with scripted mock data — this is not that; nothing here is simulated.)

## How it works

```
┌─────────────────────┐        http://127.0.0.1:4127        ┌──────────────────────┐
│  Chrome extension    │ ───────────────────────────────────▶│   Companion app       │
│  (popup + tab/download│ ◀───────────────────────────────────│   (Node.js, runs      │
│   tracking)          │                                      │   locally)            │
└─────────────────────┘                                      └───────────┬──────────┘
                                                                            │
                                                          watches Desktop /│Downloads,
                                                        calls Claude, syncs│Calendar
                                                                            ▼
                                                        Anthropic API · Google Calendar API
```

- **Companion app** (`/companion`) — a Node process that runs in the background on your laptop. It watches your Downloads/Desktop/Screenshots folders, calls Claude to classify new files (and browser tabs sent over by the extension) into Threads, detects to-dos, and syncs due dates to Google Calendar. It stores everything locally in `companion/data/store.json`. Because it has real desktop access, it's also the thing that actually opens local files when you hit "Continue" — the extension can't do that on its own.
- **Chrome extension** (`/extension`) — the popup you actually click. It tracks your real tabs and downloads, shows Threads / Needs Review / To-Do, lets you accept or reject suggestions, and "Continue" reopens every tab and file from a Thread at once.

They only ever talk to each other over `127.0.0.1` — nothing about your files or tabs leaves your machine except the two calls you explicitly wire up: Claude (for classification) and Google Calendar (for to-do sync).

## Setup

### 1. Get an Anthropic API key

Create one at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys). Without this, Thread still works end-to-end but falls back to simple keyword-matching instead of real classification.

### 2. (Optional) Create a Google Calendar OAuth client

Only needed if you want to-dos synced to your calendar.

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and create a project (or use an existing one).
2. **APIs & Services → Library** → enable the **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** → set it up for **External** (or Internal if you're on Workspace), add yourself as a test user.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Application type: **Desktop app**.
5. Copy the generated **Client ID** and **Client Secret**.

### 3. Configure the companion app

```bash
cd companion
npm install
cp .env.example .env
```

Edit `.env` and fill in `ANTHROPIC_API_KEY`, and `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` if you did step 2. **Never commit `.env` or paste your keys anywhere outside this file** — it's already git-ignored.

The default watched folders are `~/Downloads` and `~/Desktop`; adjust `WATCH_DOWNLOADS` / `WATCH_DESKTOP` / `WATCH_SCREENSHOTS` in `.env` if yours live elsewhere.

### 4. Run the companion app

```bash
npm start
```

Leave this running in a terminal (or set it up as a login item / launch agent later). You should see:

```
Thread companion running at http://127.0.0.1:4127
  Anthropic classification: on
  Google Calendar:          configured
  Watching:                 /Users/you/Downloads, /Users/you/Desktop
```

### 5. Load the extension in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the `extension/` folder.
4. Pin the Thread icon to your toolbar and click it.

If the companion app isn't running, the popup will tell you.

### 6. Connect Google Calendar (optional)

Open the popup → **To-Do** tab → **Connect**. This opens Google's consent screen in a new tab; once you approve, the companion app stores a refresh token locally at `companion/data/google-token.json` (also git-ignored) and starts syncing due dates automatically.

## Using it

- Browse normally — new tabs and downloads get classified in the background.
- Click the Thread icon: **Needs Review** shows anything the classifier wasn't confident about (✓ to accept, ✕ to reject — both teach the classifier which threads are related to which content). **Active**/**Dormant** show your running Threads; **Continue** reopens every tab and file in one go.
- Switch to **To-Do**: add a task, or let one get created automatically when a file/tab looks actionable (e.g. an email tab that says "send by Friday"). Anything with a detected due date syncs to your calendar once connected.
- **Watched locations** at the bottom of the popup toggles which folders the companion app watches, live.

## What's still manual / next steps

- The companion app runs in a terminal for now — no tray icon or auto-start on login yet. It's a small step to wrap it with a menu-bar shell later if you want that.
- Screenshot-specific detection currently keys off filenames containing "screenshot" plus image extensions in your watched folders — accurate for the default OS screenshot naming, but tell me if yours are named differently and I'll adjust.
- Classification runs one item at a time via Claude; for very bursty activity (e.g. downloading 20 files at once) you'll see them filed in quick succession rather than instantly.
