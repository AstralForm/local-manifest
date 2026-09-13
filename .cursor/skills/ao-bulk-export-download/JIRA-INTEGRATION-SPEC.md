# AO Bulk Export → Jira + Slack Webhook (V4)

## Architecture

```text
Bash download script
    → create Jira issue in AOPS (scoped token via api.atlassian.com gateway)
    → set Jira_link = site browse URL
    → ask Send Slack? (yes/no)
        → if yes: POST Slack workflow webhook (9 variables)
```

## Slack webhook schema (exact)

```json
{
  "Case": "Example text",
  "EntityName": "Example text",
  "CompanyName": "Example text",
  "User_mail": "example@example.com",
  "UserID": "U123456789",
  "Rest_of_Details": "Example text",
  "CID": "Example text",
  "Jira_link": "Example text",
  "Senior_Lead_Reviewer": "example@example.com"
}
```

Content-Type: `application/json`

## Senior Lead Reviewer options

| Option | Name | Email → `Senior_Lead_Reviewer` |
|---|---|---|
| 1 | Satvik Mishra | smishra@rippling.com |
| 2 | Pratisruti Roy | proy@rippling.com |
| 3 | Jake Sagadraca | jsagadraca@rippling.com |
| 4 | Padmanabh Kshirsagar | pkshirsagar@rippling.com |
| 5 | Vee Tamang | btamang@rippling.com |

## Jira auth (V4 scoped token)

| Concern | Value |
|---|---|
| Auth email | `adharewa@rippling.com` |
| Project | `AOPS` |
| Issue type | `Task` |
| Site URL (browse links) | `https://rippling.atlassian.net` |
| Cloud ID | `969226a5-2105-49eb-a9f7-e3852660973e` |
| API base (create) | `https://api.atlassian.com/ex/jira/{cloudId}` |

### Select Jira scopes (classic only)

| Scope | Required? | Purpose |
|---|---|---|
| `write:jira-work` | **Required** | Create the AOPS issue |
| `read:jira-work` | **Required for our case** | Resolve project / issue type during create |

Do **not** select Confluence scopes, `manage:jira-*`, or delete scopes.

**Token resolution order:**

1. `$JIRA_API_TOKEN` environment variable
2. macOS Keychain item `ao-bulk-export-jira-api-token` (account `adharewa@rippling.com`)
3. Embedded V4 scoped default in generated scripts / `SKILL.md`

Scoped tokens fail against `https://rippling.atlassian.net/rest/...` — always use the gateway for create.

Do **not** also create a Jira issue from the Slack workflow (duplicates). Display `{Jira_link}` in the message and remove the red JIRA button.

## Workflow message (insert variables)

```text
AO Bulk Export — review requested

Case: {Case}
Company: {CompanyName}
Entity: {EntityName}
CID: {CID}
Requester email: {User_mail}
Requester Slack ID: {UserID}
Senior Lead Reviewer: {Senior_Lead_Reviewer}
Jira: {Jira_link}

{Rest_of_Details}

@acc-ops-seniors please review. If ARR is under 250K, tag @accountops-managers for further review.
```
