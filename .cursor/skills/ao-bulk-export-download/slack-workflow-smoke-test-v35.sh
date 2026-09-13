#!/bin/bash

set -e

##############################################
# AO Bulk Export — Slack Workflow Smoke Test (V3.5)
#
# Created by: Arham Dharewa
#
# Does NOT download files.
# Prompts for webhook variables and POSTs the exact
# Slack Workflow Builder JSON schema.
##############################################

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SUCCESS=6
SKIPPED=0
FAILED=1
TOTAL_FILES=7

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

build_slack_workflow_payload() {
    printf '{"Case":"%s","EntityName":"%s","CompanyName":"%s","User_mail":"%s","UserID":"%s","Rest_of_Details":"%s","CID":"%s"}' \
        "$(json_escape "$Case")" \
        "$(json_escape "$EntityName")" \
        "$(json_escape "$CompanyName")" \
        "$(json_escape "$User_mail")" \
        "$(json_escape "$UserID")" \
        "$(json_escape "$Rest_of_Details")" \
        "$(json_escape "$CID")"
}

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}AO Slack Workflow Smoke Test V3.5${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""

while [ -z "${Case:-}" ]; do read -r -p "Case: " Case; done
while [ -z "${CompanyName:-}" ]; do read -r -p "CompanyName: " CompanyName; done
while [ -z "${EntityName:-}" ]; do read -r -p "EntityName [Smoke Entity]: " e; EntityName="${e:-Smoke Entity}"; done
while [ -z "${User_mail:-}" ]; do read -r -p "User_mail: " User_mail; done
while [ -z "${UserID:-}" ]; do read -r -p "UserID: " UserID; done
while [ -z "${CID:-}" ]; do read -r -p "CID: " CID; done

if [ "$FAILED" -gt 0 ]; then
    TITLE_LINE='AO Bulk Export - Workflow Triggered ⚠️'
    ACTION_LINE='⚠️ Action needed: one or more downloads failed — re-check before upload.'
else
    TITLE_LINE='AO Bulk Export - Workflow Triggered ✅'
    ACTION_LINE=''
fi

Rest_of_Details=$(cat <<EOF
${TITLE_LINE}

Run details:
- Case: ${Case}
- CompanyName: ${CompanyName}
- EntityName: ${EntityName}
- CID: ${CID}
- User_mail: ${User_mail}
- UserID: ${UserID}

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

payload="$(build_slack_workflow_payload)"
echo ""
echo -e "${BLUE}Payload:${NC}"
echo "$payload"
echo ""

response="$(curl -sS -w $'\n%{http_code}' -X POST \
    -H 'Content-Type: application/json' \
    --data-binary "$payload" \
    "$SLACK_WEBHOOK_URL" 2>&1)" || true
http_code="$(printf '%s\n' "$response" | tail -n 1)"
body="$(printf '%s\n' "$response" | sed '$d')"

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}Slack workflow triggered (${http_code}).${NC}"
    echo "$body"
else
    echo -e "${YELLOW}Slack workflow failed (${http_code}).${NC}"
    echo "$body"
fi
