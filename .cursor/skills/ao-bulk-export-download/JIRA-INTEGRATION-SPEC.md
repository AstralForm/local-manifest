# AO Bulk Export → Jira + Slack Webhook (V4)

## Architecture

```text
Bash download script
    → ask Create Jira issue? (yes/no)
        → if yes: create AOPS Task (scoped token via api.atlassian.com gateway)
        → set Jira_link = site browse URL (or n/a if no/fail)
    → ask Send Slack notification? (yes/no)
        → if yes: POST Slack workflow webhook (9 variables; URL embedded)
```

## Embedded defaults (do not prompt)

| Field | Value |
|---|---|
| `JIRA_EMAIL` | `adharewa@rippling.com` |
| `JIRA_CLOUD_ID` | `969226a5-2105-49eb-a9f7-e3852660973e` |
| `JIRA_API_BASE` | `https://api.atlassian.com/ex/jira/969226a5-2105-49eb-a9f7-e3852660973e` |
| `JIRA_SITE_URL` | `https://rippling.atlassian.net` |
| Token scopes | `read:jira-work` + `write:jira-work` |
| Slack webhook | `https://hooks.slack.com/triggers/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` |

## Runtime confirmations

```text
Create Jira issue? (yes/no):
Send Slack notification? (yes/no):
```

Both are independent. Skipping Jira sets `Jira_link=n/a` and still allows Slack.

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
