# AO Bulk Export → Slack Webhook → Jira AOPS (V3.5)

## Architecture

```text
Bash download script
    → POST Slack workflow webhook (7 variables)
        → Slack Workflow
            → Channel notification / review request
            → Create Jira issue in project AOPS
```

No Jira button. No Jira REST call inside the Bash script (avoids duplicate tickets).

## Slack webhook variable schema (exact)

From Workflow Builder **From a webhook**:

| Variable | Source in script |
|---|---|
| `Case` | Prompt |
| `EntityName` | Prompt (default from dump); download folder |
| `CompanyName` | Prompt |
| `User_mail` | Prompt (requester email for Jira) |
| `UserID` | Prompt (Slack member ID, e.g. `U123456789`) |
| `Rest_of_Details` | Auto-built after downloads |
| `CID` | Prompt |

### Example HTTP body

```json
{
  "Case": "CASE-12345",
  "EntityName": "Acme Corporation",
  "CompanyName": "Acme Corp",
  "User_mail": "ada@rippling.com",
  "UserID": "U123456789",
  "Rest_of_Details": "AO Bulk Export - Workflow Triggered ✅\n\nDownload results:\n- Successful: 10\n...",
  "CID": "CID-001"
}
```

Content-Type: `application/json`

Default webhook URL (override with `SLACK_WEBHOOK_URL`):

```text
https://hooks.slack.com/triggers/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
```

## Recommended Slack → Jira field mapping (workflow)

Configure the workflow’s **Create Jira issue** step like this:

| Jira field | Webhook variable |
|---|---|
| Project | `AOPS` (fixed) |
| Issue type | Task (or your AOPS default) |
| Summary | `AO Bulk Export Review — {{CompanyName}} / {{EntityName}} ({{Case}})` |
| Description | Include `User_mail`, `UserID`, `Case`, `CID`, `CompanyName`, `EntityName`, and `Rest_of_Details` |
| Requester / reporter context | Prefer `User_mail` / `UserID` — **not** the service account |

### Jira API auth inside the Slack workflow only

| Setting | Value |
|---|---|
| Auth email | `adharewa@rippling.com` |
| Auth secret | Atlassian API token stored in the workflow / Slack connector |
| Rule | Service account for API auth only; requester = `User_mail` / `UserID` |

## cURL test (matches Workflow Builder)

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  --data '{
    "Case": "CASE-12345",
    "EntityName": "Acme Corporation",
    "CompanyName": "Acme Corp",
    "User_mail": "ada@rippling.com",
    "UserID": "U123456789",
    "Rest_of_Details": "AO Bulk Export - Workflow Triggered ✅\n\nDownload results:\n- Successful: 1\n- Skipped: 0\n- Failed: 0",
    "CID": "CID-001"
  }' \
  'https://hooks.slack.com/triggers/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'
```

Expect HTTP `200` / `{"ok":true}` and a workflow run.

## Error handling

| Condition | Behavior |
|---|---|
| Slack HTTP non-200 | Print code/body; downloads already finished |
| Missing prompt values | Re-prompt until non-empty |
| Download failures | Continue; reflect counts in `Rest_of_Details` |

## Acceptance criteria

- [ ] Script prompts for Case, EntityName, CompanyName, User_mail, UserID, CID
- [ ] Script POSTs JSON with those exact keys + `Rest_of_Details`
- [ ] Content-Type is `application/json`
- [ ] Payload is **not** `{"text":"..."}`
- [ ] Slack workflow receives variables and can create AOPS issue
- [ ] Jira auth in workflow uses `adharewa@rippling.com`; requester comes from `User_mail`/`UserID`
- [ ] No duplicate Jira create from the Bash script
