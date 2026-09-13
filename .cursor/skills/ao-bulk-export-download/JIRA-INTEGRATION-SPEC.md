# AO Bulk Export → Jira + Slack Webhook (V3.6)

## Architecture

```text
Bash download script
    → create Jira issue in AOPS
    → set Jira_link = browse URL
    → POST Slack workflow webhook (8 variables, including Jira_link)
        → Slack channel message shows {{Jira_link}}
```

No Jira button. Script creates the issue; Slack only displays the link.

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
  "Jira_link": "Example text"
}
```

Content-Type: `application/json`

## Workflow message (insert variables)

```text
AO Bulk Export — review requested

Case: {Case}
Company: {CompanyName}
Entity: {EntityName}
CID: {CID}
Requester email: {User_mail}
Requester Slack ID: {UserID}
Jira: {Jira_link}

{Rest_of_Details}

@acc-ops-seniors please review. If ARR is under 250K, tag @accountops-managers for further review.
```

Remove the red **JIRA** button and the “submit JIRA using button” note.

## Jira create (in script)

| Setting | Value |
|---|---|
| Project | `AOPS` |
| Auth | `adharewa@rippling.com` + `$JIRA_API_TOKEN` |
| Requester in description | `User_mail` / `UserID` |
| `Jira_link` | `https://rippling.atlassian.net/browse/AOPS-###` or `n/a` |

```bash
export JIRA_API_TOKEN='your_atlassian_api_token'
```
