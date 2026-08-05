# ThreadTone

Rewrite Slack replies so they match the **tone** and **topic** of the thread — built for Slack on Mac, with an optional menu-bar companion.

## What you get

| Piece | Path | Role |
|-------|------|------|
| Slack app (Bolt JS) | `threadtone/` | Message shortcut + `/threadtone` modal inside Slack for Mac |
| Mac menu bar app | `mac/ThreadTone/` | Paste thread context + draft, rewrite via local API |
| Local rewrite API | `threadtone/src/local-server.js` | Powers the Mac app without Slack tokens |

### In Slack

1. **Message shortcut** → *More actions* on any message → **Rewrite for thread**
2. ThreadTone loads recent replies, detects tone (formal / casual / urgent / supportive / technical / collaborative) and topics
3. You paste or type a draft → **Rewrite** → edit the result → **Post to thread**
4. Or run `/threadtone your draft` inside a thread

### On Mac (menu bar)

1. Run the local API: `npm run local-api` in `threadtone/`
2. Open `mac/ThreadTone` in Xcode (or `swift run` on macOS 13+)
3. Paste thread lines + your draft → Rewrite → Copy into Slack

## Quick start (Slack app)

### Prerequisites

- Node.js 18+ (includes `npm`)
- [Slack CLI](https://docs.slack.dev/tools/slack-cli/) (`slack`)
- A Slack workspace or [developer sandbox](https://api.slack.com/developer-program/sandboxes)

### Install Node.js on Mac (if `npm` is not found)

If you see `zsh: command not found: npm`, install Node first:

```bash
# 1) Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2) Install Node (brings npm)
brew install node

# 3) Confirm
node --version   # should be v18+
npm --version
```

Or download the macOS installer from [nodejs.org](https://nodejs.org/) (LTS), then open a **new** terminal tab and retry.

### Install & run

```bash
cd threadtone
npm install
cp .env.example .env
```

**Option A — Slack CLI (recommended)**

```bash
# from threadtone/
slack login
slack run
```

The CLI creates the app from `manifest.json`, installs it, and injects tokens.

**Option B — Manual tokens**

1. Create an app at [api.slack.com/apps](https://api.slack.com/apps) and paste `manifest.json`
2. Enable **Socket Mode**, generate an app-level token (`connections:write`)
3. Install to your workspace and copy Bot + Signing Secret into `.env`
4. `npm start`

### Optional LLM quality

Without keys, ThreadTone uses a built-in heuristic rewriter (works offline).

```bash
# .env
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
LLM_PROVIDER=auto
```

### Local API (for Mac companion)

```bash
cd threadtone
ENABLE_LOCAL_API=true LOCAL_API_PORT=8787 npm run local-api
# health check
curl -s http://127.0.0.1:8787/health
```

Example rewrite:

```bash
curl -s http://127.0.0.1:8787/v1/rewrite \
  -H 'Content-Type: application/json' \
  -d '{
    "draft": "gonna look at the logs later",
    "messages": [
      "API latency spiked after deploy — P0 blocker.",
      "CI is red on the schema PR. Need this ASAP."
    ]
  }' | jq .
```

## Mac menu bar app

```bash
cd mac/ThreadTone
# On a Mac with Xcode / Swift 5.9+:
swift run
```

Or open the folder in Xcode (File → Open → `Package.swift`), set the run destination to **My Mac**, and run.

In **Settings**, point the base URL at `http://127.0.0.1:8787`.

## Tests

```bash
cd threadtone
npm test
```

## Project layout

```
threadtone/
  manifest.json          # Slack app manifest (scopes, shortcut, slash command)
  src/
    app.js               # Bolt entry (Socket Mode)
    local-server.js      # Mac companion API
    services/            # thread fetch, tone analysis, rewrite
    blocks/              # modal + App Home
    listeners/           # shortcuts, commands, actions, views, events
mac/ThreadTone/          # SwiftUI menu bar companion
```

## Scopes

Bot scopes: `channels:history`, `groups:history`, `im:history`, `mpim:history`, `chat:write`, `commands`, `users:read`.
