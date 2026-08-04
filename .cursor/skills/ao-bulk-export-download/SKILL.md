---
name: ao-bulk-export-download
description: >-
  Generate a macOS-ready Bash download script from Rippling Bulk Export (or similar)
  raw text dumps containing an entity name, document labels (PAYSTUB, HUB, PRELIM_W2, W2),
  download URLs, or "No links found". Optionally posts progress to Slack via workflow
  webhook. Use whenever the user pastes such export text or asks for AO bulk export
  download script generation (V3.2).
---

# AO — Bulk Export Download Script Generator V3.2 (TEST)

## Initialization

When this skill loads and no dump has been pasted yet, reply only:

```text
Ready. Please paste your raw text dump. I'll generate a downloadable Bash script named after the entity (for example, Acme Corporation.sh) containing all valid download commands, Slack progress posts (optional/overrideable), and the macOS commands required to execute it.
```

## When to use

Use when the user pastes admin export text that includes:
- An entity/company name
- Document labels (e.g. `PAYSTUB`, `HUB`, `PRELIM_W2`, `W2`, or similar)
- A download URL or `No links found` after each label

Goal: one production-ready Bash script that downloads every available document in a single run, immediately executable on macOS after `chmod +x`, and posts progress to Slack when a webhook is available.

## Parse rules

### Entity name

1. Find the line `Select an entity` (case-insensitive).
2. Entity = the first non-empty line after it that is **not**:
   - a document label candidate (see below)
   - a URL (`http://` or `https://`)
   - `No links found` (case-insensitive)
   - pure UI chrome (`Select an entity`, buttons, empty lines)
3. If that fails, use the first non-empty non-chrome line near the top of the dump.
4. If still unknown, ask once for the entity name. Do not invent one.
5. Preserve the entity name **exactly** inside the script (`ENTITY_DIR`, headers, summary).

### Document entries

Walk the dump top to bottom. A **document entry** is:

- **Label**: a single non-empty line that is immediately followed (ignoring blank lines) by either a URL or `No links found`
- Labels are preserved exactly (do not rename or re-case)
- Known examples include `PAYSTUB`, `HUB`, `PRELIM_W2`, `W2` — do **not** limit to that list

### Valid vs skipped

| After label | Action |
|---|---|
| Line starting with `http://` or `https://` | Include download (URL **unchanged**) |
| `No links found` (case-insensitive) | Skip entirely — no `curl` |
| Anything else | Skip; treat as non-downloadable |

### Counts and order

- `TOTAL_FILES` = number of valid URLs only
- Preserve original label order among included downloads
- If no valid URLs → reply **only** `No downloadable links were detected.` (no script)

### Duplicate labels

If the same label appears more than once with valid URLs, keep the label in messages as-is, but save files as:

- first: `LABEL.zip`
- later: `LABEL_2.zip`, `LABEL_3.zip`, …

### Filename sanitization

Script file: `<ENTITY_NAME>.sh`

If the entity contains invalid filename characters, sanitize **only the filename**:
- Replace `/ \ : * ? " < > |` with `_`
- Collapse consecutive `_`
- Trim leading/trailing spaces and `_`
- Keep the original entity string inside the script

## Slack progress (V3.2 TEST)

Generated scripts must include Slack notifications via Slack Workflow webhook trigger.

**Webhook resolution order:**
1. `$SLACK_WEBHOOK_URL` environment variable if set
2. Else V3.2 TEST default:
   `https://hooks.slack.com/triggers/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`

**Payload format** (Workflow trigger):

```json
{"text":"your message here"}
```

**When to notify:**
- Start of run
- After each file outcome (downloaded / skipped / failed)
- Final summary

Slack failures must never abort downloads (`|| true`).

**Production note:** Rotate this TEST webhook before wide rollout; prefer env-only secrets later.

## Response format

Every successful response must include, in order:

1. **Script file** written as `<sanitized-or-exact ENTITY_NAME>.sh` (also show full contents in a `bash` fenced block if the environment cannot attach a file).
2. **Brief confirmation**, including any labels skipped for `No links found`, and that Slack progress posts are enabled.
3. **macOS run commands**.

### Chat confirmation (example)

```text
Generated: Acme Corporation.sh (14 downloads). Slack progress: ON (env override supported).
Omitted (no links): PRELIM_W2
```

### macOS execution

If saved in Downloads:

```bash
cd ~/Downloads
chmod +x '<ENTITY_NAME>.sh'
./'<ENTITY_NAME>.sh'
```

Optional override:

```bash
export SLACK_WEBHOOK_URL='https://hooks.slack.com/triggers/...'
./'<ENTITY_NAME>.sh'
```

## Generated script contract

Produce exactly this structure. Substitute `ENTITY_NAME`, `CURRENT_DATE_TIME`, `TOTAL_FILES`, and one download block per valid URL. Never alter, decode, truncate, or strip URL parameters.

```bash
#!/bin/bash

set -e

##############################################
# AO Bulk Export Download Script
#
# Generated by:
# AO - Bulk Export Download Script Generator V3.2 (TEST)
#
# Entity:
# ENTITY_NAME
#
# Generated:
# CURRENT_DATE_TIME
##############################################

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

ENTITY_DIR='ENTITY_NAME'
SUCCESS=0
FAILED=0
SKIPPED=0
TOTAL_FILES=NUMBER_OF_DOWNLOADS
CURRENT=0

# Slack Workflow webhook (env overrides TEST default)
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-https://hooks.slack.com/triggers/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}"

json_escape() {
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/	/\\t/g' | awk '{printf "%s\\n", $0}' | sed 's/\\n$//'
}

notify_slack() {
    local msg="$1"
    local payload
    [ -z "$SLACK_WEBHOOK_URL" ] && return 0
    payload="{\"text\":\"$(json_escape "$msg")\"}"
    curl -sS -X POST \
        -H 'Content-type: application/json' \
        --data "$payload" \
        "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
}

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}Rippling Bulk Export Downloader${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""
echo -e "${BLUE}Entity:${NC} $ENTITY_DIR"
echo -e "${BLUE}Files to Download:${NC} $TOTAL_FILES"
echo -e "${BLUE}Download Folder:${NC} $ENTITY_DIR"
echo -e "${BLUE}Slack Progress:${NC} enabled"
echo ""
echo -e "${CYAN}==========================================${NC}"
echo ""

mkdir -p "$ENTITY_DIR"
notify_slack "AO Bulk Export started: $ENTITY_DIR ($TOTAL_FILES files)"

# --- repeat one block per valid URL (CURRENT increments for every block) ---
CURRENT=$((CURRENT+1))
echo -e "${BLUE}[$CURRENT/$TOTAL_FILES]${NC}"
echo "Downloading LABEL..."
if [ -f "$ENTITY_DIR/LABEL.zip" ]; then
    echo -e "${YELLOW}Skipping LABEL (already exists)${NC}"
    SKIPPED=$((SKIPPED+1))
    notify_slack "[$CURRENT/$TOTAL_FILES] Skipping LABEL (already exists) — $ENTITY_DIR"
else
    if curl -L -f -o "$ENTITY_DIR/LABEL.zip" 'URL_EXACTLY_AS_PROVIDED'; then
        echo -e "${GREEN}✓ LABEL downloaded${NC}"
        SUCCESS=$((SUCCESS+1))
        notify_slack "[$CURRENT/$TOTAL_FILES] ✓ LABEL downloaded — $ENTITY_DIR"
    else
        echo -e "${RED}✗ Failed to download LABEL${NC}"
        FAILED=$((FAILED+1))
        rm -f "$ENTITY_DIR/LABEL.zip"
        notify_slack "[$CURRENT/$TOTAL_FILES] ✗ Failed to download LABEL — $ENTITY_DIR"
    fi
fi
echo ""
# --- end block ---

echo ""
echo -e "${CYAN}Download Summary${NC}"
echo ""
echo -e "${GREEN}Successful :${NC} $SUCCESS"
echo -e "${YELLOW}Skipped    :${NC} $SKIPPED"
echo -e "${RED}Failed     :${NC} $FAILED"

notify_slack "AO Bulk Export done: $ENTITY_DIR — Successful: $SUCCESS | Skipped: $SKIPPED | Failed: $FAILED"

echo ""
echo -e "${CYAN}==========================================${NC}"
echo -e "${GREEN}Download Complete!${NC}"
echo ""
echo -e "${BLUE}Entity:${NC} $ENTITY_DIR"
echo -e "${GREEN}Successful:${NC} $SUCCESS"
echo -e "${YELLOW}Skipped:${NC} $SKIPPED"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""
echo -e "${BLUE}Location:${NC}"
echo "$ENTITY_DIR"
echo ""
echo -e "${CYAN}==========================================${NC}"
```

### Color usage

| Meaning | Color |
|---|---|
| Success | green |
| Skipped | yellow |
| Failure | red |
| Headers / banners | cyan |
| Information / progress | blue |

### Non-negotiables

- One `curl -L -f -o` per valid URL; wrap in `if` so failures do not abort the run under `set -e`
- Save as `.zip` in `"$ENTITY_DIR"` (no nested dirs)
- Skip existing files; remove partial files on curl failure
- Progress line: `[CURRENT/TOTAL]` then `Downloading LABEL...`
- Always create entity dir; always print summary + completion footer
- Always include Slack `notify_slack` helper and start / per-file / done posts
- URLs and labels unchanged; entity name unchanged inside the script
