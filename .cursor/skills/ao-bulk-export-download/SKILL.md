---
name: ao-bulk-export-download
description: >-
  Generate a macOS-ready Bash download script from Rippling Bulk Export (or similar)
  raw text dumps containing an entity name, document labels (PAYSTUB, HUB, PRELIM_W2, W2),
  download URLs, or "No links found". At run time the script asks for user name, case id,
  company name, and entity name; after downloads it creates a Jira issue in project AOPS
  (auth: adharewa@rippling.com + API token) using Slack UserName as requester, then posts
  one Slack completion message. Use whenever the user pastes such export text or asks for
  AO bulk export download script generation (V3.4).
---

# AO — Bulk Export Download Script Generator V3.4

## Initialization

When this skill loads and no dump has been pasted yet, reply only:

```text
Ready. Please paste your raw text dump. I'll generate a downloadable Bash script named after the entity (for example, Acme Corporation.sh) with valid download commands, interactive prompts (user / case / company / entity), automatic Jira issue creation in AOPS, one Slack completion message, and the macOS run commands.
```

## When to use

Use when the user pastes admin export text that includes:
- An entity/company name
- Document labels (e.g. `PAYSTUB`, `HUB`, `PRELIM_W2`, `W2`, or similar)
- A download URL or `No links found` after each label

Goal: one Bash script that downloads every available document, creates a **Jira review issue in `AOPS` automatically** (no Jira button), and posts **one** Slack completion message.

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

At the **start** of every generated script (before downloads), prompt for:

1. User name ← this is **Slack `UserName` / requester** (stored in Jira description; **not** used as Jira API auth)
2. Case ID
3. Company name
4. Entity name (default = extracted entity; Enter keeps default)

Re-prompt if any value is empty.

Do **not** post to Slack or create Jira at start. Do **not** post per-file Slack updates.

## Jira issue creation (automatic — in script)

After downloads finish (summary counters final), the script **must** create one Jira issue via REST API. No Jira UI button.

### Configuration

| Setting | Value |
|---|---|
| Project | `AOPS` |
| Issue type | `Task` (override with `$JIRA_ISSUE_TYPE`) |
| Auth email | `adharewa@rippling.com` (**API auth only**) |
| API token | `$JIRA_API_TOKEN` env var (**required**; never hardcode) |
| Base URL | `$JIRA_BASE_URL` (default `https://rippling.atlassian.net`) |

### Security

- Never embed the API token in the skill, generated script, git, Slack, or chat
- Operators set token once on their Mac:

```bash
export JIRA_API_TOKEN='your_atlassian_api_token'
export JIRA_BASE_URL='https://rippling.atlassian.net'   # if different
```

- If `JIRA_API_TOKEN` is missing: print a clear warning, skip Jira create, still send Slack
- Jira create failures must not abort downloads (`|| true` / non-fatal)

### Issue summary

```text
AO Bulk Export Review — <Company> / <Entity> (<Case ID>)
```

### Issue description (plain text via REST API v2)

```text
Automatic review request from AO Bulk Export download script.

Requester (Slack UserName): <user name>
Case ID: <case id>
Company: <company name>
Entity: <entity name>

Download results:
- Successful: <n>
- Skipped: <n>
- Failed: <n>
- Files attempted: <TOTAL_FILES>
- Download folder: <entity folder>

Note: Jira API authenticated as adharewa@rippling.com. Requester is the Slack UserName above.
```

### Labels

`ao-bulk-export`, `review-request`

### REST call

```bash
POST "$JIRA_BASE_URL/rest/api/2/issue"
Auth: curl -u "adharewa@rippling.com:$JIRA_API_TOKEN"
Content-Type: application/json
```

Parse response `key` (e.g. `AOPS-123`) and build browse URL:
`$JIRA_BASE_URL/browse/$JIRA_ISSUE_KEY`

## Slack completion message (only)

Post **exactly one** Slack message **after** downloads finish and **after** the Jira attempt.

**Webhook resolution:**
1. `$SLACK_WEBHOOK_URL` if set
2. Else: `https://hooks.slack.com/triggers/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`

**Payload:** `{"text":"<multi-line message>"}` — bash-only JSON (never `python3`, never `sed`).

**Layout (Unicode only — Workflow Builder does not render mrkdwn reliably):**

```text
AO Bulk Export - Workflow Triggered ✅

━━━━━━━━━━━━━━━━━━━━
📋 RUN DETAILS
━━━━━━━━━━━━━━━━━━━━
👤 User:      <user name>
🎫 Case ID:   <case id>
🏢 Company:   <company name>
🏛 Entity:    <entity name>

━━━━━━━━━━━━━━━━━━━━
📊 RESULTS
━━━━━━━━━━━━━━━━━━━━
🟢 Successful:       <n>
🟡 Skipped:          <n>
🔴 Failed:           <n>
📁 Files attempted:  <TOTAL_FILES>
📂 Download folder:  <entity folder>

━━━━━━━━━━━━━━━━━━━━
🎫 JIRA
━━━━━━━━━━━━━━━━━━━━
🔗 Issue: <AOPS-123 or "not created">
🌐 Link:  <browse URL or "n/a">
```

If `Failed` > 0, use ⚠️ in the title and append:

```text
⚠️ Action needed: one or more downloads failed — re-check before upload.
```

Do **not** include Next step or `@acc-ops-seniors`.

## Response format

1. Script file `<ENTITY_NAME>.sh` (and bash fence if needed)
2. Brief confirmation (omitted labels + Jira AOPS + Slack once)
3. macOS run commands + required env vars

### Chat confirmation (example)

```text
Generated: Acme Corporation.sh (14 downloads).
Prompts: user name, case ID, company name, entity name.
Jira: creates AOPS Task after downloads (auth adharewa@rippling.com; requester = User name).
Slack: one completion message including Jira key/link.
Omitted (no links): PRELIM_W2

Before first run:
export JIRA_API_TOKEN='...'
```

### macOS execution

```bash
export JIRA_API_TOKEN='your_atlassian_api_token'
# optional: export JIRA_BASE_URL='https://rippling.atlassian.net'
# optional: export SLACK_WEBHOOK_URL='https://hooks.slack.com/triggers/...'

cd ~/Downloads
chmod +x '<ENTITY_NAME>.sh'
./'<ENTITY_NAME>.sh'
```

## Generated script contract

Substitute `DEFAULT_ENTITY`, `CURRENT_DATE_TIME`, `TOTAL_FILES`, and one download block per valid URL. Never alter URLs.

```bash
#!/bin/bash

set -e

##############################################
# AO Bulk Export Download Script
#
# Generated by:
# AO - Bulk Export Download Script Generator V3.4
#
# Created by:
# Arham Dharewa
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

JIRA_ISSUE_KEY=''
JIRA_ISSUE_URL=''
JIRA_CREATE_STATUS='not created'

# --- Slack ---
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-https://hooks.slack.com/triggers/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}"

# --- Jira (AOPS) ---
# Auth email is the service account ONLY. Requester = prompted USER_NAME (Slack UserName).
JIRA_EMAIL='adharewa@rippling.com'
JIRA_API_TOKEN="${JIRA_API_TOKEN:-}"
JIRA_BASE_URL="${JIRA_BASE_URL:-https://rippling.atlassian.net}"
JIRA_PROJECT_KEY='AOPS'
JIRA_ISSUE_TYPE="${JIRA_ISSUE_TYPE:-Task}"

json_escape() {
    local s=$1
    s=${s//\\/\\\\}
    s=${s//\"/\\\"}
    s=${s//$'\t'/\\t}
    s=${s//$'\r'/\\r}
    s=${s//$'\n'/\\n}
    printf '%s' "$s"
}

build_slack_payload() {
    local msg="$1"
    # Bash-only JSON — never call python3 (macOS Xcode CLT stub)
    printf '{"text":"%s"}' "$(json_escape "$msg")"
}

notify_slack() {
    local msg="$1"
    local payload response http_code body
    [ -z "$SLACK_WEBHOOK_URL" ] && return 0
    payload="$(build_slack_payload "$msg")" || {
        echo -e "${YELLOW}Slack payload build failed.${NC}"
        return 0
    }
    response="$(curl -sS -w $'\n%{http_code}' -X POST \
        -H 'Content-type: application/json; charset=utf-8' \
        --data-binary "$payload" \
        "$SLACK_WEBHOOK_URL" 2>&1)" || true
    http_code="$(printf '%s\n' "$response" | tail -n 1)"
    body="$(printf '%s\n' "$response" | sed '$d')"
    if [ "$http_code" = "200" ]; then
        echo -e "${BLUE}Slack completion message sent.${NC}"
    else
        echo -e "${YELLOW}Slack completion message did not trigger.${NC}"
        echo -e "${YELLOW}Slack response code: ${http_code}${NC}"
        echo -e "${YELLOW}Slack response body:${NC}"
        echo "$body"
    fi
}

create_jira_issue() {
    local summary description payload response http_code body
    JIRA_ISSUE_KEY=''
    JIRA_ISSUE_URL=''
    JIRA_CREATE_STATUS='not created'

    if [ -z "$JIRA_API_TOKEN" ]; then
        echo -e "${YELLOW}Jira skipped: JIRA_API_TOKEN is not set.${NC}"
        echo -e "${YELLOW}Set it with: export JIRA_API_TOKEN='your_atlassian_api_token'${NC}"
        return 0
    fi

    summary="AO Bulk Export Review — ${COMPANY_NAME} / ${ENTITY_DIR} (${CASE_ID})"
    description=$(cat <<EOF
Automatic review request from AO Bulk Export download script.

Requester (Slack UserName): ${USER_NAME}
Case ID: ${CASE_ID}
Company: ${COMPANY_NAME}
Entity: ${ENTITY_DIR}

Download results:
- Successful: ${SUCCESS}
- Skipped: ${SKIPPED}
- Failed: ${FAILED}
- Files attempted: ${TOTAL_FILES}
- Download folder: ${ENTITY_DIR}

Note: Jira API authenticated as ${JIRA_EMAIL}. Requester is the Slack UserName above.
EOF
)

    payload=$(printf '{"fields":{"project":{"key":"%s"},"summary":"%s","issuetype":{"name":"%s"},"labels":["ao-bulk-export","review-request"],"description":"%s"}}' \
        "$(json_escape "$JIRA_PROJECT_KEY")" \
        "$(json_escape "$summary")" \
        "$(json_escape "$JIRA_ISSUE_TYPE")" \
        "$(json_escape "$description")")

    echo -e "${BLUE}Creating Jira issue in ${JIRA_PROJECT_KEY}...${NC}"
    response="$(curl -sS -w $'\n%{http_code}' -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
        -X POST \
        -H 'Content-Type: application/json' \
        -H 'Accept: application/json' \
        --data-binary "$payload" \
        "${JIRA_BASE_URL}/rest/api/2/issue" 2>&1)" || true

    http_code="$(printf '%s\n' "$response" | tail -n 1)"
    body="$(printf '%s\n' "$response" | sed '$d')"

    if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
        JIRA_ISSUE_KEY="$(printf '%s' "$body" | sed -n 's/.*"key"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"
        if [ -n "$JIRA_ISSUE_KEY" ]; then
            JIRA_ISSUE_URL="${JIRA_BASE_URL}/browse/${JIRA_ISSUE_KEY}"
            JIRA_CREATE_STATUS="$JIRA_ISSUE_KEY"
            echo -e "${GREEN}Jira issue created: ${JIRA_ISSUE_KEY}${NC}"
            echo -e "${BLUE}${JIRA_ISSUE_URL}${NC}"
        else
            JIRA_CREATE_STATUS='created (key parse failed)'
            echo -e "${YELLOW}Jira issue created but key could not be parsed.${NC}"
            echo "$body"
        fi
    else
        JIRA_CREATE_STATUS='failed'
        echo -e "${YELLOW}Jira issue creation failed.${NC}"
        echo -e "${YELLOW}HTTP ${http_code}${NC}"
        echo "$body"
    fi
}

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}Rippling Bulk Export Downloader${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""
echo -e "${BLUE}Enter run details${NC}"
echo ""

while [ -z "${USER_NAME:-}" ]; do
    read -r -p "User name (Slack requester): " USER_NAME
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
echo -e "${BLUE}User (requester):${NC} $USER_NAME"
echo -e "${BLUE}Case ID:${NC} $CASE_ID"
echo -e "${BLUE}Company:${NC} $COMPANY_NAME"
echo -e "${BLUE}Entity:${NC} $ENTITY_DIR"
echo -e "${BLUE}Files to Download:${NC} $TOTAL_FILES"
echo -e "${BLUE}Download Folder:${NC} $ENTITY_DIR"
echo -e "${BLUE}Jira:${NC} auto-create in $JIRA_PROJECT_KEY after downloads"
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

create_jira_issue

if [ "$FAILED" -gt 0 ]; then
    TITLE_EMOJI='⚠️'
    ACTION_LINE='⚠️ Action needed: one or more downloads failed — re-check before upload.'
else
    TITLE_EMOJI='✅'
    ACTION_LINE=''
fi

if [ -n "$JIRA_ISSUE_KEY" ]; then
    JIRA_LINK_LINE="$JIRA_ISSUE_URL"
else
    JIRA_LINK_LINE='n/a'
fi

SLACK_MSG=$(cat <<EOF
AO Bulk Export - Workflow Triggered ${TITLE_EMOJI}

━━━━━━━━━━━━━━━━━━━━
📋 RUN DETAILS
━━━━━━━━━━━━━━━━━━━━
👤 User:      ${USER_NAME}
🎫 Case ID:   ${CASE_ID}
🏢 Company:   ${COMPANY_NAME}
🏛 Entity:    ${ENTITY_DIR}

━━━━━━━━━━━━━━━━━━━━
📊 RESULTS
━━━━━━━━━━━━━━━━━━━━
🟢 Successful:       ${SUCCESS}
🟡 Skipped:          ${SKIPPED}
🔴 Failed:           ${FAILED}
📁 Files attempted:  ${TOTAL_FILES}
📂 Download folder:  ${ENTITY_DIR}

━━━━━━━━━━━━━━━━━━━━
🎫 JIRA
━━━━━━━━━━━━━━━━━━━━
🔗 Issue: ${JIRA_CREATE_STATUS}
🌐 Link:  ${JIRA_LINK_LINE}
${ACTION_LINE:+
${ACTION_LINE}}
EOF
)
notify_slack "$SLACK_MSG"

echo ""
echo -e "${CYAN}==========================================${NC}"
echo -e "${GREEN}Download Complete!${NC}"
echo ""
echo -e "${BLUE}Entity:${NC} $ENTITY_DIR"
echo -e "${GREEN}Successful:${NC} $SUCCESS"
echo -e "${YELLOW}Skipped:${NC} $SKIPPED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${BLUE}Jira:${NC} $JIRA_CREATE_STATUS"
[ -n "$JIRA_ISSUE_URL" ] && echo -e "${BLUE}Jira URL:${NC} $JIRA_ISSUE_URL"
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

- Prompt for user name, case ID, company name, entity name before downloads
- After downloads: create one Jira issue in `AOPS` (no Jira button)
- Jira API auth = `adharewa@rippling.com` + `$JIRA_API_TOKEN` only
- Jira requester field in description = prompted User name (Slack UserName)
- Never hardcode the API token
- One Slack message only after downloads + Jira attempt; include Jira key/link
- Slack JSON via bash-only `json_escape` (never `python3`, never `sed`)
- Plain-text Unicode Slack layout
- Jira/Slack failures must not abort the script after downloads
- One `curl -L -f -o` per valid URL; wrap in `if`
- Save as `.zip` in `"$ENTITY_DIR"`; skip existing; remove partials on failure
- Progress: `[CURRENT/TOTAL]` then `Downloading LABEL...`
- Script header includes Created by: Arham Dharewa
- URLs and labels unchanged
