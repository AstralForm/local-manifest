---
name: ao-bulk-export-download
description: >-
  Generate a macOS-ready Bash download script from Rippling Bulk Export (or similar)
  raw text dumps containing an entity name, document labels (PAYSTUB, HUB, PRELIM_W2, W2),
  download URLs, or "No links found". At run time the script asks for Case, EntityName,
  CompanyName, User_mail, UserID, CID, and Senior Lead Reviewer; after downloads it creates a Jira AOPS issue, then POSTs one Slack
  workflow webhook including Jira_link using the exact variable schema (no Jira button). Use whenever the user pastes such export text or asks for AO bulk
  export download script generation (V3.6).
---

# AO — Bulk Export Download Script Generator V3.6

## Initialization

When this skill loads and no dump has been pasted yet, reply only:

```text
Ready. Please paste your raw text dump. I'll generate a downloadable Bash script named after the entity (for example, Acme Corporation.sh) with valid download commands, interactive prompts matching the Slack webhook variables (Case / EntityName / CompanyName / User_mail / UserID / CID / Jira_link / Senior_Lead_Reviewer), Jira AOPS create, one Slack workflow trigger after downloads, and the macOS run commands.
```

## When to use

Use when the user pastes admin export text that includes:
- An entity/company name
- Document labels (e.g. `PAYSTUB`, `HUB`, `PRELIM_W2`, `W2`, or similar)
- A download URL or `No links found` after each label

Goal: one Bash script that downloads every available document, creates a **Jira `AOPS` issue**, then fires the **Slack workflow webhook** with the exact variable schema (including `Jira_link`) so seniors/managers get a review request with the issue link (no Jira button).

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
5. Use the extracted entity for the **script filename** and as the **default** for the interactive `EntityName` prompt / download folder.

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

## Interactive prompts (required) — Slack webhook fields

At the **start** of every generated script (before downloads), prompt for these Slack workflow variables:

| Prompt label | Variable / shell name | Notes |
|---|---|---|
| Case | `Case` | Case ID |
| Entity name | `EntityName` | Default = extracted entity; also used as download folder |
| Company name | `CompanyName` | |
| User email | `User_mail` | Requester email for workflow / Jira |
| Slack User ID | `UserID` | e.g. `U123456789` |
| CID | `CID` | As used by AO / workflow |
| Senior Lead Reviewer | `Senior_Lead_Reviewer` | Menu selection → email address |

Re-prompt if any value is empty.

#### Senior Lead Reviewer menu (required)

Show this numbered menu and accept `1`–`5` only (re-prompt on invalid input):

```text
Select Senior Lead Reviewer:
  1) Satvik Mishra          <smishra@rippling.com>
  2) Pratisruti Roy         <proy@rippling.com>
  3) Jake Sagadraca         <jsagadraca@rippling.com>
  4) Padmanabh Kshirsagar   <pkshirsagar@rippling.com>
  5) Vee Tamang             <btamang@rippling.com>
Enter option (1-5):
```

| Option | Name | Email stored in `Senior_Lead_Reviewer` |
|---|---|---|
| 1 | Satvik Mishra | `smishra@rippling.com` |
| 2 | Pratisruti Roy | `proy@rippling.com` |
| 3 | Jake Sagadraca | `jsagadraca@rippling.com` |
| 4 | Padmanabh Kshirsagar | `pkshirsagar@rippling.com` |
| 5 | Vee Tamang | `btamang@rippling.com` |

Do **not** call Slack at start. Do **not** post per-file Slack updates.

`Rest_of_Details` is **not** prompted — the script builds it after downloads.

### Slack send confirmation (required)

**After downloads + Jira create**, ask:

```text
Send Slack notification? (yes/no):
```

| Answer | Behavior |
|---|---|
| `yes` / `y` (case-insensitive) | POST the Slack workflow webhook |
| `no` / `n` (case-insensitive) | Skip Slack entirely — do not trigger the webhook |
| anything else | Re-prompt until yes or no |

Jira create still runs even if Slack is skipped.

## Slack workflow webhook (only completion trigger)

After downloads finish (counters final) **and after Jira create**, if the operator answered **yes** to Slack, POST **exactly one** request to the Slack workflow webhook. If they answered **no**, skip Slack.

### Webhook URL resolution

1. `$SLACK_WEBHOOK_URL` if set
2. Else default:
   `https://hooks.slack.com/triggers/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`

### Required Content-Type

`application/json`

### Exact JSON body (keys must match Workflow Builder)

```json
{
  "Case": "<Case>",
  "EntityName": "<EntityName>",
  "CompanyName": "<CompanyName>",
  "User_mail": "<User_mail>",
  "UserID": "<UserID>",
  "Rest_of_Details": "<auto-built summary>",
  "CID": "<CID>",
  "Jira_link": "<https://.../browse/AOPS-123>",
  "Senior_Lead_Reviewer": "<selected reviewer email>"
}
```

**Never** send `{"text":"..."}` to this webhook — Workflow Builder variables will not populate.

### `Rest_of_Details` format (Unicode plain text)

Do **not** repeat Case / Company / Entity / CID / User_mail / UserID here — the Slack workflow message already shows those fields. `Rest_of_Details` is only status + RESULTS.

Use Unicode emoji (not `:shortcodes:`) so Workflow Builder renders them.

```text
AO Bulk Export - Workflow Triggered ✅

━━━━━━━━━━━━━━━━━━━━
📊 RESULTS
━━━━━━━━━━━━━━━━━━━━
🟢 Successful:       <n>
🟡 Skipped:          <n>
🔴 Failed:           <n>
📁 Files attempted:  <TOTAL_FILES>
📂 Download folder:  <EntityName>
```

If `Failed` > 0, use ⚠️ in the first line and append:

```text
⚠️ Action needed: one or more downloads failed — re-check before upload.
```

### Slack Workflow Builder message (required fix)

The channel message in the screenshot is wrong because Workflow Builder still has a hardcoded **Next step** block with:

- `#Important Note: Please make sure to submit JIRA using button`
- **JIRA** button

That text is **not** from the Bash script. Edit the workflow **Send a message** step to:

1. **Delete** the Important Note / “submit JIRA using button” line  
2. **Delete** the red **JIRA** button  
3. Insert webhook variables so the message shows run data  
4. Keep review buttons only if still needed (`Seniors Review`, `Manager Review`)  
5. Insert `{{Jira_link}}` in the message (issue is created by the Bash script)

**Recommended message body to paste into Workflow Builder:**

```text
AO Bulk Export — review requested

Case: {{Case}}
Company: {{CompanyName}}
Entity: {{EntityName}}
CID: {{CID}}
Requester email: {{User_mail}}
Requester Slack ID: {{UserID}}
Senior Lead Reviewer: {{Senior_Lead_Reviewer}}
Jira: {{Jira_link}}

{{Rest_of_Details}}

@acc-ops-seniors please review. If ARR is under 250K, tag @accountops-managers for further review.
```

(Use Workflow Builder’s **Insert a variable** control for each `{{...}}` field — do not type braces by hand if the UI provides inserts.)

### JSON encoding

- Build the object with bash-only escaping (`json_escape`)
- **Never** use `python3` (macOS Xcode stub) or `sed` for JSON escaping
- Slack failures must not abort the script

## Jira (`AOPS`) — created in the Bash script

After downloads (before Slack), the script creates one Jira issue and sets `Jira_link`.

| Concern | Rule |
|---|---|
| Project | `AOPS` |
| Issue type | `Task` (override with `$JIRA_ISSUE_TYPE`) |
| API auth email | `adharewa@rippling.com` (**auth only**) |
| API token | `$JIRA_API_TOKEN` (required for create; never hardcode) |
| Base URL | `$JIRA_BASE_URL` (default `https://rippling.atlassian.net`) |
| Requester in description | `User_mail` + `UserID` from prompts |
| `Jira_link` value | `{JIRA_BASE_URL}/browse/{KEY}` or `n/a` if skipped/failed |

Slack workflow should **display** `{{Jira_link}}` in the channel message. Do **not** also create a second Jira issue in the workflow (avoids duplicates). Remove the red **JIRA** button.

## Response format

1. Script file `<ENTITY_NAME>.sh` (and bash fence if needed)
2. Brief confirmation (omitted labels + Slack schema including `Jira_link` + Jira create)
3. macOS run commands

### Chat confirmation (example)

```text
Generated: Acme Corporation.sh (14 downloads).
Prompts: Case, EntityName, CompanyName, User_mail, UserID, CID, Senior Lead Reviewer (1-5).
Jira: creates AOPS Task after downloads; sends Jira_link in Slack webhook.
Slack: one workflow POST with Case/EntityName/CompanyName/User_mail/UserID/Rest_of_Details/CID/Jira_link/Senior_Lead_Reviewer.
Omitted (no links): PRELIM_W2

Before first run:
export JIRA_API_TOKEN='...'
```

### macOS execution

```bash
export JIRA_API_TOKEN='your_atlassian_api_token'
# optional:
# export JIRA_BASE_URL='https://rippling.atlassian.net'
# export SLACK_WEBHOOK_URL='https://hooks.slack.com/triggers/...'

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
# AO - Bulk Export Download Script Generator V3.6
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

# Slack workflow webhook ("From a webhook" variables)
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-https://hooks.slack.com/triggers/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}"

json_escape() {
    local s=$1
    s=${s//\\/\\\\}
    s=${s//\"/\\\"}
    s=${s//$'\t'/\\t}
    s=${s//$'\r'/\\r}
    s=${s//$'\n'/\\n}
    printf '%s' "$s"
}

# Exact Workflow Builder schema — do not rename keys
# Jira (created in script; link sent to Slack as Jira_link)
JIRA_EMAIL='adharewa@rippling.com'
JIRA_API_TOKEN="${JIRA_API_TOKEN:-}"
JIRA_BASE_URL="${JIRA_BASE_URL:-https://rippling.atlassian.net}"
JIRA_PROJECT_KEY='AOPS'
JIRA_ISSUE_TYPE="${JIRA_ISSUE_TYPE:-Task}"
Jira_link=''

create_jira_issue() {
    local summary description payload response http_code body key
    Jira_link=''
    if [ -z "$JIRA_API_TOKEN" ]; then
        echo -e "${YELLOW}Jira skipped: JIRA_API_TOKEN is not set.${NC}"
        echo -e "${YELLOW}export JIRA_API_TOKEN='your_atlassian_api_token'${NC}"
        Jira_link='n/a'
        return 0
    fi
    summary="AO Bulk Export Review — ${CompanyName} / ${EntityName} (${Case})"
    description=$(cat <<EOF
Automatic review request from AO Bulk Export download script.

Requester (Slack User_mail): ${User_mail}
Requester (Slack UserID): ${UserID}
Senior Lead Reviewer: ${Senior_Lead_Reviewer}
Case: ${Case}
CID: ${CID}
Company: ${CompanyName}
Entity: ${EntityName}

Download results:
- Successful: ${SUCCESS}
- Skipped: ${SKIPPED}
- Failed: ${FAILED}
- Files attempted: ${TOTAL_FILES}
- Download folder: ${EntityName}

Note: Jira API authenticated as ${JIRA_EMAIL}. Requester is User_mail / UserID above.
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
        key="$(printf '%s' "$body" | sed -n 's/.*"key"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"
        if [ -n "$key" ]; then
            Jira_link="${JIRA_BASE_URL}/browse/${key}"
            echo -e "${GREEN}Jira issue created: ${key}${NC}"
            echo -e "${BLUE}${Jira_link}${NC}"
        else
            Jira_link='n/a'
            echo -e "${YELLOW}Jira created but key parse failed.${NC}"
            echo "$body"
        fi
    else
        Jira_link='n/a'
        echo -e "${YELLOW}Jira issue creation failed (HTTP ${http_code}).${NC}"
        echo "$body"
    fi
}

build_slack_workflow_payload() {
    printf '{"Case":"%s","EntityName":"%s","CompanyName":"%s","User_mail":"%s","UserID":"%s","Rest_of_Details":"%s","CID":"%s","Jira_link":"%s","Senior_Lead_Reviewer":"%s"}' \
        "$(json_escape "$Case")" \
        "$(json_escape "$EntityName")" \
        "$(json_escape "$CompanyName")" \
        "$(json_escape "$User_mail")" \
        "$(json_escape "$UserID")" \
        "$(json_escape "$Rest_of_Details")" \
        "$(json_escape "$CID")" \
        "$(json_escape "$Jira_link")" \
        "$(json_escape "$Senior_Lead_Reviewer")"
}

notify_slack_workflow() {
    local payload response http_code body
    [ -z "$SLACK_WEBHOOK_URL" ] && return 0
    payload="$(build_slack_workflow_payload)" || {
        echo -e "${YELLOW}Slack payload build failed.${NC}"
        return 0
    }
    echo -e "${BLUE}Triggering Slack workflow webhook...${NC}"
    response="$(curl -sS -w $'\n%{http_code}' -X POST \
        -H 'Content-Type: application/json' \
        --data-binary "$payload" \
        "$SLACK_WEBHOOK_URL" 2>&1)" || true
    http_code="$(printf '%s\n' "$response" | tail -n 1)"
    body="$(printf '%s\n' "$response" | sed '$d')"
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}Slack workflow triggered.${NC}"
    else
        echo -e "${YELLOW}Slack workflow did not trigger.${NC}"
        echo -e "${YELLOW}Slack response code: ${http_code}${NC}"
        echo -e "${YELLOW}Slack response body:${NC}"
        echo "$body"
    fi
}

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}Rippling Bulk Export Downloader${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""
echo -e "${BLUE}Enter Slack workflow run details${NC}"
echo ""

while [ -z "${Case:-}" ]; do
    read -r -p "Case: " Case
done
while [ -z "${CompanyName:-}" ]; do
    read -r -p "CompanyName: " CompanyName
done
while [ -z "${EntityName:-}" ]; do
    read -r -p "EntityName [$DEFAULT_ENTITY]: " ENTITY_INPUT
    EntityName="${ENTITY_INPUT:-$DEFAULT_ENTITY}"
done
while [ -z "${User_mail:-}" ]; do
    read -r -p "User_mail: " User_mail
done
while [ -z "${UserID:-}" ]; do
    read -r -p "UserID (e.g. U123456789): " UserID
done
while [ -z "${CID:-}" ]; do
    read -r -p "CID: " CID
done

Senior_Lead_Reviewer=''
while [ -z "$Senior_Lead_Reviewer" ]; do
    echo ""
    echo "Select Senior Lead Reviewer:"
    echo "  1) Satvik Mishra          <smishra@rippling.com>"
    echo "  2) Pratisruti Roy         <proy@rippling.com>"
    echo "  3) Jake Sagadraca         <jsagadraca@rippling.com>"
    echo "  4) Padmanabh Kshirsagar   <pkshirsagar@rippling.com>"
    echo "  5) Vee Tamang             <btamang@rippling.com>"
    read -r -p "Enter option (1-5): " SLR_OPTION
    case "$SLR_OPTION" in
        1) Senior_Lead_Reviewer='smishra@rippling.com' ;;
        2) Senior_Lead_Reviewer='proy@rippling.com' ;;
        3) Senior_Lead_Reviewer='jsagadraca@rippling.com' ;;
        4) Senior_Lead_Reviewer='pkshirsagar@rippling.com' ;;
        5) Senior_Lead_Reviewer='btamang@rippling.com' ;;
        *) echo -e "${YELLOW}Invalid option. Please enter 1-5.${NC}" ;;
    esac
done

echo ""
echo -e "${BLUE}Case:${NC} $Case"
echo -e "${BLUE}CompanyName:${NC} $CompanyName"
echo -e "${BLUE}EntityName:${NC} $EntityName"
echo -e "${BLUE}User_mail:${NC} $User_mail"
echo -e "${BLUE}UserID:${NC} $UserID"
echo -e "${BLUE}CID:${NC} $CID"
echo -e "${BLUE}Senior_Lead_Reviewer:${NC} $Senior_Lead_Reviewer"
echo -e "${BLUE}Files to Download:${NC} $TOTAL_FILES"
echo -e "${BLUE}Download Folder:${NC} $EntityName"
echo -e "${BLUE}Jira:${NC} auto-create AOPS issue"
echo -e "${BLUE}Slack:${NC} optional — asked after downloads"
echo ""
echo -e "${CYAN}==========================================${NC}"
echo ""

mkdir -p "$EntityName"

# --- repeat one block per valid URL (CURRENT increments for every block) ---
CURRENT=$((CURRENT+1))
echo -e "${BLUE}[$CURRENT/$TOTAL_FILES]${NC}"
echo "Downloading LABEL..."
if [ -f "$EntityName/LABEL.zip" ]; then
    echo -e "${YELLOW}Skipping LABEL (already exists)${NC}"
    SKIPPED=$((SKIPPED+1))
else
    if curl -L -f -o "$EntityName/LABEL.zip" 'URL_EXACTLY_AS_PROVIDED'; then
        echo -e "${GREEN}✓ LABEL downloaded${NC}"
        SUCCESS=$((SUCCESS+1))
    else
        echo -e "${RED}✗ Failed to download LABEL${NC}"
        FAILED=$((FAILED+1))
        rm -f "$EntityName/LABEL.zip"
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

if [ "$FAILED" -gt 0 ]; then
    TITLE_LINE='AO Bulk Export - Workflow Triggered ⚠️'
    ACTION_LINE='Action needed: one or more downloads failed — re-check before upload.'
else
    TITLE_LINE='AO Bulk Export - Workflow Triggered ✅'
    ACTION_LINE=''
fi

Rest_of_Details=$(cat <<EOF
${TITLE_LINE}

━━━━━━━━━━━━━━━━━━━━
📊 RESULTS
━━━━━━━━━━━━━━━━━━━━
🟢 Successful:       ${SUCCESS}
🟡 Skipped:          ${SKIPPED}
🔴 Failed:           ${FAILED}
📁 Files attempted:  ${TOTAL_FILES}
📂 Download folder:  ${EntityName}
${ACTION_LINE:+
${ACTION_LINE}}
EOF
)

create_jira_issue

SEND_SLACK=''
while true; do
    read -r -p "Send Slack notification? (yes/no): " SEND_SLACK
    case "$(printf '%s' "$SEND_SLACK" | tr '[:upper:]' '[:lower:]')" in
        yes|y)
            notify_slack_workflow
            break
            ;;
        no|n)
            echo -e "${YELLOW}Slack notification skipped.${NC}"
            break
            ;;
        *)
            echo -e "${YELLOW}Please answer yes or no.${NC}"
            ;;
    esac
done

echo ""
echo -e "${CYAN}==========================================${NC}"
echo -e "${GREEN}Download Complete!${NC}"
echo ""
echo -e "${BLUE}EntityName:${NC} $EntityName"
echo -e "${GREEN}Successful:${NC} $SUCCESS"
echo -e "${YELLOW}Skipped:${NC} $SKIPPED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${BLUE}Jira_link:${NC} $Jira_link"
echo ""
echo -e "${BLUE}Location:${NC}"
echo "$EntityName"
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

- Prompt for `Case`, `EntityName`, `CompanyName`, `User_mail`, `UserID`, `CID` before downloads
- Prompt Senior Lead Reviewer via options 1-5; set `Senior_Lead_Reviewer` to that person's email
- After downloads + Jira: ask `Send Slack notification? (yes/no)` — only POST webhook on yes
- On Slack `no`, do not trigger the webhook
- When Slack is yes: one workflow POST with **exact** keys from Workflow Builder (including `Jira_link` and `Senior_Lead_Reviewer`)
- Auto-build `Rest_of_Details` (do not prompt for it)
- Content-Type must be `application/json`
- Never send `{"text":"..."}` to this webhook
- Bash-only JSON escaping (never `python3`, never `sed`)
- After downloads: create one Jira `AOPS` issue (auth `adharewa@rippling.com` + `$JIRA_API_TOKEN`); set `Jira_link`
- Never hardcode the API token in the skill or generated script; missing token → `Jira_link=n/a`
- Slack failures must not abort after downloads
- One `curl -L -f -o` per valid URL; wrap in `if`
- Save as `.zip` in `"$EntityName"`; skip existing; remove partials on failure
- Progress: `[CURRENT/TOTAL]` then `Downloading LABEL...`
- Script header includes Created by: Arham Dharewa
- URLs and labels unchanged
