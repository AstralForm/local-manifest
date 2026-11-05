# AO Bulk Export → Jira + Slack Webhook (V4)

## Architecture

```text
Bash download script
    → ask Create Jira issue? (yes/no)
        → if yes:
            auth as JIRA_EMAIL (adharewa@rippling.com)
            resolve JIRA_Reporter=User_mail → accountId
            create AOPS Task with reporter=accountId (fallback if screen blocks)
            set Jira_link = site browse URL (or n/a if no/fail)
    → ask Send Slack notification? (yes/no)
        → if yes: POST Slack workflow webhook (9 variables; URL embedded)
```

## Auth vs Reporter

| Field | Value |
|---|---|
| `JIRA_EMAIL` | `adharewa@rippling.com` — **API auth only** |
| `JIRA_Reporter` | `User_mail` from terminal prompt — **issue Reporter** |

Creator may still show the auth account. Reporter should show the operator's Atlassian user after lookup.

### One-time Jira admin prerequisite

AOPS currently rejects setting Reporter via API (`Field 'reporter' cannot be set`) until:

1. **Reporter** is added to the AOPS **Create** and **Edit** screens
2. Auth account has **Modify Reporter** permission on AOPS

Until then the script retries create without Reporter and warns in Terminal.

## Embedded defaults (do not prompt)

| Field | Value |
|---|---|
| `JIRA_EMAIL` | `adharewa@rippling.com` (auth only) |
| `JIRA_CLOUD_ID` | `969226a5-2105-49eb-a9f7-e3852660973e` |
| `JIRA_API_BASE` | `https://api.atlassian.com/ex/jira/969226a5-2105-49eb-a9f7-e3852660973e` |
| `JIRA_SITE_URL` | `https://rippling.atlassian.net` |
| Token scopes | `read:jira-work` + `write:jira-work` |
| Slack webhook | `https://hooks.slack.com/triggers/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` |

`Rest_of_Details` must be **ASCII-only** (no emoji / box-drawing).

## Runtime confirmations

```text
Create Jira issue? (yes/no):
Send Slack notification? (yes/no):
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

## Senior Lead Reviewer options

| Option | Name | Email → `Senior_Lead_Reviewer` |
|---|---|---|
| 1 | Satvik Mishra | smishra@rippling.com |
| 2 | Pratisruti Roy | proy@rippling.com |
| 3 | Jake Sagadraca | jsagadraca@rippling.com |
| 4 | Padmanabh Kshirsagar | pkshirsagar@rippling.com |
| 5 | Vee Tamang | btamang@rippling.com |

Do **not** also create a Jira issue from the Slack workflow (duplicates). Display `{Jira_link}` and remove the red JIRA button.
