# AO Bulk Export → Jira + Slack Webhook (V3.6)

## Architecture

```text
Bash download script
    → create Jira issue in AOPS
    → set Jira_link = browse URL
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
