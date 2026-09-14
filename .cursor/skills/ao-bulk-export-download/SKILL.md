---
name: ao-bulk-export-download
description: >-
  Generate a macOS-ready Bash download script from Rippling Bulk Export (or similar)
  raw text dumps containing an entity name, document labels (PAYSTUB, HUB, PRELIM_W2, W2),
  download URLs, or "No links found". At run time the script asks for Case, EntityName,
  CompanyName, User_mail, UserID, CID, and Senior Lead Reviewer; after downloads it asks Create Jira
  issue? (yes/no) then optionally Create Slack notification? (yes/no). Jira uses embedded scoped token +
  cloud ID (no prompts for those). Use whenever the user pastes such export text or asks for AO bulk
  export download script generation (V4).
---

# AO bulk export download script generator V4

## Activation and initial response

Use this skill when the user pastes AO/Rippling Bulk Export text or asks for a macOS Bash script that downloads export documents from a raw text dump.

When the skill loads and no dump has been pasted, reply exactly:

```text
Ready. Please paste your raw text dump. I'll generate a downloadable Bash script named after the entity with valid download commands, interactive prompts for Case / EntityName / CompanyName / User_mail / UserID / CID / Senior_Lead_Reviewer, optional Create Jira issue? (yes/no), optional Send Slack notification? (yes/no), and macOS run commands.
```

Do not use this skill for general Jira work, Slack workflow editing, or document exports that are not represented by pasted raw export text.

## Required outcome

Generate one macOS-compatible Bash script that:

1. Prompts for required run details before downloading.
2. Downloads every valid document URL from the pasted dump into a folder named for the entity.
3. Asks `Create Jira issue? (yes/no)`.
4. If yes: creates one Jira `AOPS` Task using embedded scoped token + cloud ID (**do not prompt** for token/cloud ID).
5. Sets `Jira_link` to the created issue browse URL, or `n/a` if skipped or create fails.
6. Asks `Send Slack notification? (yes/no)`.
7. If yes: sends exactly one Slack Workflow webhook payload (webhook URL embedded — **do not prompt** for it).
8. Prints a clear summary and macOS run commands.

The assistant generates the script only. Do not execute the script, call Jira, call Slack, or download documents on the user's behalf unless the user separately asks for that and an approved tool workflow exists.

## Parse the pasted dump

### Entity name

1. Find `Select an entity` case-insensitively.
2. Use the first following non-empty line that is not:
   - a document label candidate;
   - a URL beginning with `http://` or `https://`;
   - `No links found`;
   - obvious UI chrome.
3. If that fails, use the first non-empty non-chrome line near the top of the dump.
4. If the entity is still unknown, ask once for the entity name. Do not invent it.

Preserve the original extracted entity as `DEFAULT_ENTITY` inside the generated script.

### Document entries

Walk the dump top to bottom. A document entry is a single non-empty label line immediately followed, ignoring blank lines, by either:

- a URL beginning with `http://` or `https://`; or
- `No links found`, case-insensitively.

Preserve labels exactly for display messages. Do not limit labels to known examples such as `PAYSTUB`, `HUB`, `PRELIM_W2`, or `W2`.

### Valid, skipped, and unsafe links

- Include only `http://` or `https://` URLs.
- Preserve included URLs exactly in the generated script.
- Skip entries followed by `No links found`.
- Skip entries followed by anything else.
- Skip URLs with unsupported schemes.
- If no valid URLs are found, reply exactly: `No downloadable links were detected.` Do not generate a script.

### Counts, order, and duplicate labels

- `TOTAL_FILES` is the count of valid URLs only.
- Preserve original order among valid downloads.
- For duplicate labels with valid URLs, keep the label unchanged in messages and save files as:
  - first occurrence: `LABEL.zip`
  - second occurrence: `LABEL_2.zip`
  - third occurrence: `LABEL_3.zip`

## Sanitize generated names

Sanitize the script filename and download folder name independently.

For filesystem names:

- Replace `/ \ : * ? " < > |` with `_`.
- Collapse repeated `_`.
- Trim leading/trailing spaces, periods, and `_`.
- If the result is empty, `.` or `..`, ask for a safe entity name.

Use:

- script file: `<safe entity>.sh`
- download folder default: safe entity name
- displayed/default entity prompt value: original entity string

## Required runtime prompts

At the start of the generated script, before any downloads, prompt in this order and re-prompt until non-empty:

1. `Case`
2. `EntityName` with the extracted entity as the default
3. `CompanyName`
4. `User_mail`
5. `UserID`
6. `CID`
7. `Senior_Lead_Reviewer` using the reviewer menu below

Do not let inherited shell variables silently replace these prompt values. Initialize these prompt variables inside the script before prompting.

**Do not prompt** for `JIRA_CLOUD_ID`, `JIRA_API_TOKEN`, `JIRA_EMAIL`, or `SLACK_WEBHOOK_URL`. Embed the V4 defaults below.

### Senior Lead Reviewer menu

Show this menu and accept only `1` through `5`:

```text
Select Senior Lead Reviewer:
  1) Satvik Mishra          <smishra@rippling.com>
  2) Pratisruti Roy         <proy@rippling.com>
  3) Jake Sagadraca         <jsagadraca@rippling.com>
  4) Padmanabh Kshirsagar   <pkshirsagar@rippling.com>
  5) Vee Tamang             <btamang@rippling.com>
Enter option (1-5):
```

Store only the selected email address in `Senior_Lead_Reviewer`.

`Rest_of_Details` is not prompted. Build it after downloads.

## External configuration (V4 embedded defaults)

Embed these defaults in every generated script. Env vars still override if set. **Never prompt** for cloud ID, token, email, or webhook.

### Jira configuration (embed exactly)

```bash
JIRA_EMAIL='adharewa@rippling.com'
JIRA_API_TOKEN_DEFAULT='ATATT3xFfGF0uREu47ts2Jr-Quz-ygsQ0W-QuuX3pDoqxjezfupGdS-pMfm-91oEPZJrbrysTMZG3iBHPKak_zbbwZhAZFwCh3rug-hNSH--puX3rzSzSGpRGcqXjDcJghxQXh9pxfwQgKxTBfR4252aVkO_5-IJQgJSWi3Vzz7dBHIrqH9sjus=5B77062D'
if [ -z "${JIRA_API_TOKEN:-}" ]; then
    JIRA_API_TOKEN="$(security find-generic-password -a 'adharewa@rippling.com' -s 'ao-bulk-export-jira-api-token' -w 2>/dev/null || true)"
fi
JIRA_API_TOKEN="${JIRA_API_TOKEN:-$JIRA_API_TOKEN_DEFAULT}"
JIRA_SITE_URL="${JIRA_SITE_URL:-https://rippling.atlassian.net}"
JIRA_CLOUD_ID="${JIRA_CLOUD_ID:-969226a5-2105-49eb-a9f7-e3852660973e}"
JIRA_API_BASE="${JIRA_API_BASE:-https://api.atlassian.com/ex/jira/${JIRA_CLOUD_ID}}"
JIRA_PROJECT_KEY='AOPS'
JIRA_ISSUE_TYPE="${JIRA_ISSUE_TYPE:-Task}"
```

| Field | Default |
|---|---|
| `JIRA_EMAIL` | `adharewa@rippling.com` (auth only) |
| `JIRA_CLOUD_ID` | `969226a5-2105-49eb-a9f7-e3852660973e` |
| `JIRA_API_BASE` | `https://api.atlassian.com/ex/jira/${JIRA_CLOUD_ID}` |
| `JIRA_SITE_URL` | `https://rippling.atlassian.net` (browse links only) |
| `JIRA_PROJECT_KEY` | `AOPS` |
| `JIRA_ISSUE_TYPE` | `Task` |
| Token scopes | classic `read:jira-work` + `write:jira-work` |

Token resolution: `$JIRA_API_TOKEN` → Keychain `ao-bulk-export-jira-api-token` → **embedded default above**.

Create issues via **gateway** `${JIRA_API_BASE}/rest/api/2/issue` (scoped tokens fail on site URL `/rest/...`).

Set `Jira_link="${JIRA_SITE_URL}/browse/${key}"` on success.

### Slack configuration (embed exactly)

```bash
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-https://hooks.slack.com/triggers/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}"
```

Resolution: `$SLACK_WEBHOOK_URL` → embedded default above. **Do not prompt** for the webhook URL.

If Slack is confirmed but somehow empty, print a warning and skip Slack without failing.

## Generated Bash requirements

Create a Bash script compatible with the default macOS shell environment. Avoid dependencies that are not normally present on macOS. Do not require `python3`.

Use controlled error handling instead of allowing one failed external operation to abort the full script unexpectedly. It is acceptable to use `set -u` and `set -o pipefail`; avoid unguarded `set -e` unless every expected failure path is explicitly protected.

The generated script must include:

- ANSI colors: green success, yellow skipped/warning, red failure, cyan headers, blue information.
- `json_escape` implemented in Bash for Slack and Jira JSON string values.
- Directory creation before downloads.
- One generated download block per valid URL.
- `curl` download behavior with redirects, failure detection, timeouts, and partial-file cleanup.
- Distinct counters for:
  - successful downloads;
  - existing files skipped;
  - failed downloads;
  - non-downloadable labels omitted from generation.
- Header comment: Generated by AO Bulk Export Download Script Generator V4; Created by: Arham Dharewa
- After downloads: ask Create Jira issue? (yes/no); create only on yes (no cloud-id/token prompts)
- After Jira handling: ask Send Slack notification? (yes/no); POST only on yes
- Final summary including `Jira_link`.

For each valid URL, generate a block equivalent to:

```bash
CURRENT=$((CURRENT+1))
echo -e "${BLUE}[$CURRENT/$TOTAL_FILES]${NC}"
echo "Downloading LABEL..."
if [ -f "$DOWNLOAD_DIR/FILENAME.zip" ]; then
    echo -e "${YELLOW}Skipping LABEL (already exists)${NC}"
    SKIPPED_EXISTING=$((SKIPPED_EXISTING+1))
else
    if curl --location --fail --connect-timeout 20 --max-time "${CURL_MAX_TIME:-600}" --max-filesize "${CURL_MAX_FILESIZE:-524288000}" -o "$DOWNLOAD_DIR/FILENAME.zip" 'URL_EXACTLY_AS_PROVIDED'; then
        echo -e "${GREEN}✓ LABEL downloaded${NC}"
        SUCCESS=$((SUCCESS+1))
    else
        echo -e "${RED}✗ Failed to download LABEL${NC}"
        FAILED=$((FAILED+1))
        rm -f "$DOWNLOAD_DIR/FILENAME.zip"
    fi
fi
echo ""
```

Substitute `LABEL`, `FILENAME.zip`, and `URL_EXACTLY_AS_PROVIDED` per parsed entry. Do not alter the URL.

## Jira issue creation

After downloads complete, ask exactly:

```text
Create Jira issue? (yes/no):
```

- `yes` or `y`: create one Jira `AOPS` Task (using embedded token + cloud ID).
- `no` or `n`: skip Jira entirely; set `Jira_link='n/a'`; continue to Slack confirmation.
- Anything else: re-prompt.

The Jira issue must be created by the generated script, not by a Slack workflow button. Create at most one issue per script run, and only when the operator answered yes.

The issue payload must include:

- project key `AOPS` unless overridden;
- issue type `Task` unless overridden;
- summary containing company, entity, and case;
- description containing requester email, Slack user ID, senior reviewer, case, CID, company, entity, download counts, and download folder;
- labels `ao-bulk-export` and `review-request`.

Validate the HTTP response:

- On HTTP `200` or `201`, extract the issue key and set `Jira_link="${JIRA_SITE_URL}/browse/${key}"`.
- If the response is malformed or no key can be extracted, set `Jira_link='n/a'`, print the response body, and continue.
- On authentication failure, rate limit, validation error, or any non-success HTTP status, set `Jira_link='n/a'`, print a concise diagnostic, and continue.

Do not create duplicate Jira issues. Create at most one issue per script run (zero if the operator said no).

Do not use `sed` for JSON escaping. For response parsing, prefer `jq` if it is installed; otherwise use a conservative macOS-available fallback such as `perl` only to extract the issue key.

## Slack workflow notification

After Jira handling (create or skip), ask exactly:

```text
Send Slack notification? (yes/no):
```

- `yes` or `y`: send one Slack Workflow webhook request.
- `no` or `n`: skip Slack entirely.
- Anything else: re-prompt.

Slack failures must not abort the script.

### Required Slack JSON schema

Send exactly these keys to the Slack Workflow webhook:

```json
{
  "Case": "<Case>",
  "EntityName": "<EntityName>",
  "CompanyName": "<CompanyName>",
  "User_mail": "<User_mail>",
  "UserID": "<UserID>",
  "Rest_of_Details": "<auto-built summary>",
  "CID": "<CID>",
  "Jira_link": "<Jira_link>",
  "Senior_Lead_Reviewer": "<selected reviewer email>"
}
```

Set `Content-Type: application/json`.

Never send `{"text":"..."}` to this workflow webhook.

### `Rest_of_Details` format

Build `Rest_of_Details` as Unicode plain text. Do not repeat Case, Company, Entity, CID, User_mail, or UserID.

```text
━━━━━━━━━━━━━━━━━━━━
📊 RESULTS
━━━━━━━━━━━━━━━━━━━━
🟢 Successful:       <successful downloads>
🟡 Skipped existing: <existing files skipped>
🔴 Failed:           <failed downloads>
📁 Files attempted:  <TOTAL_FILES>
📂 Download folder:  <download folder>
```

If failed downloads are greater than zero, append:

```text
⚠️ Action needed: one or more downloads failed — re-check before upload.
```

## Workflow Builder guidance to include after the script

If the user is troubleshooting Slack message formatting, explain that the Slack Workflow Builder message should display webhook variables directly and should not include a separate Jira button or hardcoded instruction to submit Jira.

Recommended message body:

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

Tell the user to use Workflow Builder's variable insertion control when available instead of manually typing variable braces.

## Response format

When a script is generated, respond with:

1. The script filename.
2. The full Bash script in a fenced `bash` block, unless the product provides it as a file artifact.
3. A short confirmation covering:
   - number of downloadable URLs;
   - omitted labels with no links, if any;
   - required runtime prompts;
   - optional Create Jira issue? (yes/no);
   - optional Send Slack notification? (yes/no) with `Jira_link`.
4. macOS run commands:

```bash
cd ~/Downloads
chmod +x '<SCRIPT_NAME>.sh'
./'<SCRIPT_NAME>.sh'
```

Do **not** tell the user to export `JIRA_API_TOKEN`, `JIRA_CLOUD_ID`, or `SLACK_WEBHOOK_URL` unless they ask to override. Defaults are already embedded in the script.

## Stop conditions

Stop and ask one concise question when:

- no raw dump is present;
- the entity name cannot be determined;
- a safe script or folder name cannot be derived;
- the user asks to change the reviewer list but does not provide the replacement names and emails.

Stop with `No downloadable links were detected.` when the dump contains no valid downloadable URLs.

## Non-negotiables

- **Embed** V4 Jira token, cloud ID, and Slack webhook defaults in generated scripts (env still overrides).
- **Never prompt** for `JIRA_CLOUD_ID`, `JIRA_API_TOKEN`, `JIRA_EMAIL`, or `SLACK_WEBHOOK_URL`.
- Do not execute the generated script.
- Do not alter valid URLs.
- Do not rename or re-case labels in messages.
- Do not post Slack updates before downloads.
- Do not post per-file Slack updates.
- Ask Create Jira issue? (yes/no) after downloads; create only on yes.
- Ask Send Slack notification? (yes/no) after Jira; POST only on yes.
- Create at most one Jira issue per script run.
- Send at most one Slack webhook request per script run.
- Include `Jira_link` in the Slack payload.
- Use Bash-only JSON escaping for generated JSON values.
- Preserve macOS compatibility.
- Create Jira via Atlassian API gateway (scoped token); browse links use site URL.
