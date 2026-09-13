# AO Bulk Export → Jira Integration Spec (V3.4)

Implementation lives **inside the generated Bash download script** (not a separate Slack→Jira button).

## Goal

After AO Bulk Export downloads finish, the script automatically:

1. Creates a Jira issue in project **`AOPS`**
2. Posts one Slack completion message that includes the Jira key/link

No Jira UI button. No manual “Create issue” click.

## Slack webhook input mapping (from script prompts)

| Script prompt | Slack / workflow field | Used for |
|---|---|---|
| User name | `UserName` | **Requester** in Jira description (not API auth) |
| Case ID | `CaseID` | Jira summary + description |
| Company name | `CompanyName` | Jira summary + description |
| Entity name | `EntityName` | Jira summary + description + download folder |
| Successful / Skipped / Failed / Total | results | Jira description + Slack message |
| Jira key / URL | after create | Slack Jira section |

## Jira project configuration

| Setting | Value |
|---|---|
| Project key | `AOPS` |
| Issue type | `Task` (override: `JIRA_ISSUE_TYPE`) |
| Labels | `ao-bulk-export`, `review-request` |
| Base URL | `https://rippling.atlassian.net` (override: `JIRA_BASE_URL`) |

## Jira authentication

| Item | Value |
|---|---|
| Auth email | `adharewa@rippling.com` |
| Auth secret | Atlassian API token in **`JIRA_API_TOKEN`** env var |
| Auth method | HTTP Basic via `curl -u email:token` |

**Rules**

- Use `adharewa@rippling.com` **only** for Jira API authentication
- Use Slack / prompted **User name** as requester information inside the issue
- Never hardcode, commit, or paste the API token into the skill or generated script

### Operator setup (macOS)

```bash
export JIRA_API_TOKEN='your_atlassian_api_token'
# optional overrides:
# export JIRA_BASE_URL='https://rippling.atlassian.net'
# export JIRA_ISSUE_TYPE='Task'
# export SLACK_WEBHOOK_URL='https://hooks.slack.com/triggers/...'
```

Create a token: https://id.atlassian.com/manage-profile/security/api-tokens

## Jira REST API

```http
POST {JIRA_BASE_URL}/rest/api/2/issue
Authorization: Basic (adharewa@rippling.com:JIRA_API_TOKEN)
Content-Type: application/json
Accept: application/json
```

### Payload

```json
{
  "fields": {
    "project": { "key": "AOPS" },
    "summary": "AO Bulk Export Review — <Company> / <Entity> (<Case ID>)",
    "issuetype": { "name": "Task" },
    "labels": ["ao-bulk-export", "review-request"],
    "description": "<plain text — see format below>"
  }
}
```

### Description format

```text
Automatic review request from AO Bulk Export download script.

Requester (Slack UserName): <User name>
Case ID: <Case ID>
Company: <Company name>
Entity: <Entity name>

Download results:
- Successful: <n>
- Skipped: <n>
- Failed: <n>
- Files attempted: <TOTAL_FILES>
- Download folder: <Entity folder>

Note: Jira API authenticated as adharewa@rippling.com. Requester is the Slack UserName above.
```

### Success response

HTTP `201` (or `200`) with JSON containing `"key":"AOPS-123"`.

Browse URL: `{JIRA_BASE_URL}/browse/AOPS-123`

## cURL test commands

### 1) Verify auth + project access

```bash
curl -sS -u "adharewa@rippling.com:$JIRA_API_TOKEN" \
  -H 'Accept: application/json' \
  "$JIRA_BASE_URL/rest/api/2/project/AOPS"
```

### 2) Create a test issue

```bash
curl -sS -u "adharewa@rippling.com:$JIRA_API_TOKEN" \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  --data '{
    "fields": {
      "project": { "key": "AOPS" },
      "summary": "AO Bulk Export Review — Test Co / Test Entity (CASE-000)",
      "issuetype": { "name": "Task" },
      "labels": ["ao-bulk-export", "review-request"],
      "description": "Requester (Slack UserName): Ada Lovelace\nCase ID: CASE-000\nCompany: Test Co\nEntity: Test Entity"
    }
  }' \
  "$JIRA_BASE_URL/rest/api/2/issue"
```

## Slack confirmation message

After Jira attempt, post one Slack webhook message (`{"text":"..."}`) including:

- Run details (User, Case ID, Company, Entity)
- Results (Successful / Skipped / Failed / Files attempted / folder)
- Jira section (Issue key + browse link, or failure/skipped status)

Default webhook:

```text
https://hooks.slack.com/triggers/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
```

## Error handling

| Condition | Behavior |
|---|---|
| Missing `JIRA_API_TOKEN` | Warn, skip Jira, still Slack |
| Jira HTTP non-2xx | Print body, mark failed, still Slack |
| Slack HTTP non-200 | Print code/body, do not abort |
| Download failures | Continue remaining files; warn in Slack |

## Acceptance criteria

- [ ] Generated script prompts for User / Case / Company / Entity
- [ ] Downloads complete with success/skip/fail counters
- [ ] Script creates one `AOPS` Task without any Jira button
- [ ] Auth uses `adharewa@rippling.com` + env token only
- [ ] Issue description requester = prompted User name (Slack UserName)
- [ ] Slack message includes Jira key/link when create succeeds
- [ ] Missing token or Jira/Slack errors do not wipe download results
- [ ] API token never appears in skill source or generated script body
