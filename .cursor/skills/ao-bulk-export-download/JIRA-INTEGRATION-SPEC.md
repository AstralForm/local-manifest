# AO Bulk Export → Slack Webhook → Jira AOPS (V3.5)

## Architecture

```text
Bash download script
    → POST Slack workflow webhook (7 variables)
        → Slack Workflow
            → Channel message (variables + Rest_of_Details)
            → Create Jira issue in project AOPS   ← automatic, NO Jira button
```

No Jira button. No Jira REST call inside the Bash script (avoids duplicate tickets).

## Why the current Slack message looks wrong

The channel post titled **Next step** with:

- `#Important Note: Please make sure to submit JIRA using button`
- buttons **Seniors Review** / **Manager Review** / **JIRA**

comes from the **Slack Workflow Builder “Send a message” step**, not from the Bash script.

The script already sends:

`Case`, `EntityName`, `CompanyName`, `User_mail`, `UserID`, `Rest_of_Details`, `CID`

But the workflow message template is still the old hardcoded copy, so variables/results do not show and users are told to click **JIRA**.

## Fix in Slack Workflow Builder (do this now)

### Step A — Edit “Send a message to a channel”

1. Open workflow **AO Bulk Export Download BOT**
2. Open the **Send a message** step
3. Delete:
   - `#Important Note: Please make sure to submit JIRA using button`
   - the red **JIRA** button
4. Keep **Seniors Review** / **Manager Review** only if you still want those review flows
5. Replace the message body with variables from the webhook:

```text
AO Bulk Export — review requested

Case: {Case}
Company: {CompanyName}
Entity: {EntityName}
CID: {CID}
Requester email: {User_mail}
Requester Slack ID: {UserID}

{Rest_of_Details}

@acc-ops-seniors please review. If ARR is under 250K, tag @accountops-managers for further review.
```

Use **Insert a variable** for each field (`Case`, `CompanyName`, `EntityName`, `CID`, `User_mail`, `UserID`, `Rest_of_Details`).

6. Save the step

### Step B — Add automatic Jira create (no button)

Add a workflow step **Create an issue in Jira** (or your Jira connector action):

| Jira field | Value |
|---|---|
| Project | `AOPS` |
| Issue type | Task (or AOPS default) |
| Summary | `AO Bulk Export Review — {CompanyName} / {EntityName} ({Case})` |
| Description | Include `{User_mail}`, `{UserID}`, `{Case}`, `{CID}`, `{CompanyName}`, `{EntityName}`, `{Rest_of_Details}` |
| Auth in connector | `adharewa@rippling.com` + API token |
| Requester context | `{User_mail}` / `{UserID}` — not the service account |

Publish the workflow after saving.

## Slack webhook variable schema (exact)

| Variable | Source in script |
|---|---|
| `Case` | Prompt |
| `EntityName` | Prompt (default from dump); download folder |
| `CompanyName` | Prompt |
| `User_mail` | Prompt (requester email for Jira) |
| `UserID` | Prompt (Slack member ID, e.g. `U123456789`) |
| `Rest_of_Details` | Auto-built after downloads (includes run details + results) |
| `CID` | Prompt |

### Example HTTP body

```json
{
  "Case": "CASE-12345",
  "EntityName": "Acme Corporation",
  "CompanyName": "Acme Corp",
  "User_mail": "ada@rippling.com",
  "UserID": "U123456789",
  "Rest_of_Details": "AO Bulk Export - Workflow Triggered ✅\n\n━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS\n━━━━━━━━━━━━━━━━━━━━\n🟢 Successful:       1\n🟡 Skipped:          0\n🔴 Failed:           0\n📁 Files attempted:  1\n📂 Download folder:  Acme Corporation",
  "CID": "CID-001"
}
```

Content-Type: `application/json`

## cURL test

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  --data '{
    "Case": "CASE-12345",
    "EntityName": "Acme Corporation",
    "CompanyName": "Acme Corp",
    "User_mail": "ada@rippling.com",
    "UserID": "U123456789",
    "Rest_of_Details": "AO Bulk Export - Workflow Triggered ✅\n\nRun details:\n- Case: CASE-12345\n- CompanyName: Acme Corp\n- EntityName: Acme Corporation\n- CID: CID-001\n- User_mail: ada@rippling.com\n- UserID: U123456789\n\nDownload results:\n- Successful: 1\n- Skipped: 0\n- Failed: 0",
    "CID": "CID-001"
  }' \
  "$SLACK_WEBHOOK_URL"
```

Expect HTTP `200` / `{"ok":true}`, a channel message with the fields above, and an automatic AOPS issue (after Step B is configured).

## Acceptance criteria

- [ ] Channel message shows Case / Company / Entity / CID / requester / Rest_of_Details
- [ ] No “submit JIRA using button” note
- [ ] No red **JIRA** button
- [ ] Jira issue in `AOPS` is created automatically by the workflow
- [ ] Jira auth uses `adharewa@rippling.com`; requester comes from `User_mail` / `UserID`
- [ ] Script still POSTs the 7-key JSON schema only (no `{"text":"..."}`)
