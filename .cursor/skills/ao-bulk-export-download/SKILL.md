---
name: ao-bulk-export-download
description: >-
  Generate a macOS-ready Bash download script from Rippling Bulk Export (or similar)
  raw text dumps containing an entity name, document labels (PAYSTUB, HUB, PRELIM_W2, W2),
  download URLs, or "No links found". At run time the script asks for user name, case id,
  company name, and entity name, then posts one Slack completion message. Use whenever
  the user pastes such export text or asks for AO bulk export download script generation (V3.2).
---

# AO — Bulk Export Download Script Generator V3.2 (TEST)

## Initialization

When this skill loads and no dump has been pasted yet, reply only:

```text
Ready. Please paste your raw text dump. I'll generate a downloadable Bash script named after the entity (for example, Acme Corporation.sh) containing all valid download commands, interactive run prompts (user / case / company / entity), one Slack completion message, and the macOS commands required to execute it.
```

## When to use

Use when the user pastes admin export text that includes:
- An entity/company name
- Document labels (e.g. `PAYSTUB`, `HUB`, `PRELIM_W2`, `W2`, or similar)
- A download URL or `No links found` after each label

Goal: one Bash script that downloads every available document in a single run on macOS, collects run metadata from the operator, and posts **one** Slack message when downloads finish.

## Parse rules

### Entity name (from dump)

1. Find the line `Select an entity` (case-insensitive).
2. Entity = the first non-empty line after it that is **not**:
   - a document label candidate (see below)
   - a URL (`http://` or `https://`)
   - `No links found` (case-insensitive)
   - pure UI chrome (`Select an entity`, buttons, empty lines)
3. If that fails, use the first non-empty non-chrome line near the top of the dump.
4. If still unknown, ask once for the entity name. Do not invent one.
5. Use the extracted entity for the **script filename** and as the **default** for the interactive Entity name prompt / download folder.

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
- Keep the original entity string as `DEFAULT_ENTITY` inside the script

## Interactive prompts (required)

At the **start** of every generated script (before downloads), prompt the operator for:

1. User name
2. Case ID
3. Company name
4. Entity name (default = extracted entity from the dump; Enter keeps default)

Validate that none of the four values are empty after prompting (re-prompt or exit with an error if empty).

Do **not** post to Slack at start. Do **not** post per-file Slack updates.

## Slack completion message (only)

Post **exactly one** Slack message **after all downloads finish** (after the summary counters are final).

**Webhook resolution order:**
1. `$SLACK_WEBHOOK_URL` environment variable if set
2. Else V3.2 TEST default:
   `https://hooks.slack.com/triggers/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`

**Payload:**

```json
{"text":"<multi-line completion message>"}
```

**Message body must include:**

```text
AO Bulk Export — Download Complete

User: <user name>
Case ID: <case id>
Company: <company name>
Entity: <entity name>

Successful: <n>
Skipped: <n>
Failed: <n>
Files attempted: <TOTAL_FILES>
Download folder: <entity folder>

@acc-ops-seniors, please review the files before uploading.
```

Slack failures must never abort the script (`|| true`).

**Workflow Builder note:** the Send-a-message step must insert the webhook variable `text` (not Organization / Time / Workspace).

## Response format

Every successful response must include, in order:

1. **Script file** written as `<sanitized-or-exact ENTITY_NAME>.sh` (also show full contents in a `bash` fenced block if the environment cannot attach a file).
2. **Brief confirmation**, including omitted `No links found` labels, and that Slack posts **once at completion** with prompted metadata.
3. **macOS run commands**.

### Chat confirmation (example)

```text
Generated: Acme Corporation.sh (14 downloads).
Prompts at run: user name, case ID, company name, entity name.
Slack: one completion message only.
Omitted (no links): PRELIM_W2
```

### macOS execution

```bash
cd ~/Downloads
chmod +x '<ENTITY_NAME>.sh'
./'<ENTITY_NAME>.sh'
```

The script will pause for the four prompts, then download, then post one Slack message.

## Generated script contract

Produce exactly this structure. Substitute `DEFAULT_ENTITY`, `CURRENT_DATE_TIME`, `TOTAL_FILES`, and one download block per valid URL. Never alter, decode, truncate, or strip URL parameters.

```bash
#!/bin/bash

set -e

##############################################
# AO Bulk Export Download Script
#
# Generated by:
# AO - Bulk Export Download Script Generator V3.2 (TEST)
#
# Default entity (from dump):
# DEFAULT_ENTITY
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

DEFAULT_ENTITY='DEFAULT_ENTITY'
SUCCESS=0
FAILED=0
SKIPPED=0
TOTAL_FILES=NUMBER_OF_DOWNLOADS
CURRENT=0

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
echo -e "${BLUE}Enter run details${NC}"
echo ""

while [ -z "${USER_NAME:-}" ]; do
    read -r -p "User name: " USER_NAME
done
while [ -z "${CASE_ID:-}" ]; do
    read -r -p "Case ID: " CASE_ID
done
while [ -z "${COMPANY_NAME:-}" ]; do
    read -r -p "Company name: " COMPANY_NAME
done
while [ -z "${ENTITY_DIR:-}" ]; do
    read -r -p "Entity name [$DEFAULT_ENTITY]: " ENTITY_INPUT
    ENTITY_DIR="${ENTITY_INPUT:-$DEFAULT_ENTITY}"
done

echo ""
echo -e "${BLUE}User:${NC} $USER_NAME"
echo -e "${BLUE}Case ID:${NC} $CASE_ID"
echo -e "${BLUE}Company:${NC} $COMPANY_NAME"
echo -e "${BLUE}Entity:${NC} $ENTITY_DIR"
echo -e "${BLUE}Files to Download:${NC} $TOTAL_FILES"
echo -e "${BLUE}Download Folder:${NC} $ENTITY_DIR"
echo -e "${BLUE}Slack:${NC} one message after completion"
echo ""
echo -e "${CYAN}==========================================${NC}"
echo ""

mkdir -p "$ENTITY_DIR"

# --- repeat one block per valid URL (CURRENT increments for every block) ---
CURRENT=$((CURRENT+1))
echo -e "${BLUE}[$CURRENT/$TOTAL_FILES]${NC}"
echo "Downloading LABEL..."
if [ -f "$ENTITY_DIR/LABEL.zip" ]; then
    echo -e "${YELLOW}Skipping LABEL (already exists)${NC}"
    SKIPPED=$((SKIPPED+1))
else
    if curl -L -f -o "$ENTITY_DIR/LABEL.zip" 'URL_EXACTLY_AS_PROVIDED'; then
        echo -e "${GREEN}✓ LABEL downloaded${NC}"
        SUCCESS=$((SUCCESS+1))
    else
        echo -e "${RED}✗ Failed to download LABEL${NC}"
        FAILED=$((FAILED+1))
        rm -f "$ENTITY_DIR/LABEL.zip"
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

SLACK_MSG=$(cat <<EOF
AO Bulk Export — Download Complete

User: $USER_NAME
Case ID: $CASE_ID
Company: $COMPANY_NAME
Entity: $ENTITY_DIR

Successful: $SUCCESS
Skipped: $SKIPPED
Failed: $FAILED
Files attempted: $TOTAL_FILES
Download folder: $ENTITY_DIR

@acc-ops-seniors, please review the files before uploading.
EOF
)
notify_slack "$SLACK_MSG"
echo -e "${BLUE}Slack completion message sent.${NC}"

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

- Prompt for user name, case ID, company name, and entity name before downloads
- One Slack message only — after downloads complete — including those four fields + counts
- No Slack posts at start or per file
- One `curl -L -f -o` per valid URL; wrap in `if` so failures do not abort under `set -e`
- Save as `.zip` in `"$ENTITY_DIR"` (no nested dirs)
- Skip existing files; remove partial files on curl failure
- Progress line: `[CURRENT/TOTAL]` then `Downloading LABEL...`
- Always create entity dir; always print summary + completion footer
- URLs and labels unchanged
