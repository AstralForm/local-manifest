#!/bin/bash

set -e

##############################################
# AO Bulk Export — Jira + Slack Smoke Test (V3.4)
#
# Created by: Arham Dharewa
#
# Does NOT download files.
# Builds the same Jira payload + Slack message as V3.4.
# Creates a real Jira issue only if JIRA_API_TOKEN is set.
##############################################

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SUCCESS=1
SKIPPED=0
FAILED=0
TOTAL_FILES=1

JIRA_EMAIL='adharewa@rippling.com'
JIRA_API_TOKEN="${JIRA_API_TOKEN:-}"
JIRA_BASE_URL="${JIRA_BASE_URL:-https://rippling.atlassian.net}"
JIRA_PROJECT_KEY='AOPS'
JIRA_ISSUE_TYPE="${JIRA_ISSUE_TYPE:-Task}"
JIRA_ISSUE_KEY=''
JIRA_ISSUE_URL=''
JIRA_CREATE_STATUS='not created'

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

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}AO Jira + Slack Smoke Test V3.4${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""

while [ -z "${USER_NAME:-}" ]; do read -r -p "User name (Slack requester): " USER_NAME; done
while [ -z "${CASE_ID:-}" ]; do read -r -p "Case ID: " CASE_ID; done
while [ -z "${COMPANY_NAME:-}" ]; do read -r -p "Company name: " COMPANY_NAME; done
while [ -z "${ENTITY_DIR:-}" ]; do read -r -p "Entity name [Smoke Test Entity]: " ENTITY_INPUT; ENTITY_DIR="${ENTITY_INPUT:-Smoke Test Entity}"; done

summary="AO Bulk Export Review — ${COMPANY_NAME} / ${ENTITY_DIR} (${CASE_ID})"
description=$(cat <<EOF
Automatic review request from AO Bulk Export download script.

Requester (Slack UserName): ${USER_NAME}
Case ID: ${CASE_ID}
Company: ${COMPANY_NAME}
Entity: ${ENTITY_DIR}

Download results:
- Successful: ${SUCCESS}
- Skipped: ${SKIPPED}
- Failed: ${FAILED}
- Files attempted: ${TOTAL_FILES}
- Download folder: ${ENTITY_DIR}

Note: Jira API authenticated as ${JIRA_EMAIL}. Requester is the Slack UserName above.
EOF
)

payload=$(printf '{"fields":{"project":{"key":"%s"},"summary":"%s","issuetype":{"name":"%s"},"labels":["ao-bulk-export","review-request"],"description":"%s"}}' \
    "$(json_escape "$JIRA_PROJECT_KEY")" \
    "$(json_escape "$summary")" \
    "$(json_escape "$JIRA_ISSUE_TYPE")" \
    "$(json_escape "$description")")

echo ""
echo -e "${BLUE}Jira payload preview:${NC}"
echo "$payload"
echo ""

if [ -z "$JIRA_API_TOKEN" ]; then
    echo -e "${YELLOW}JIRA_API_TOKEN not set — skipping live Jira create.${NC}"
    echo -e "${YELLOW}export JIRA_API_TOKEN='...' to test against AOPS.${NC}"
else
    response="$(curl -sS -w $'\n%{http_code}' -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
        -X POST \
        -H 'Content-Type: application/json' \
        -H 'Accept: application/json' \
        --data-binary "$payload" \
        "${JIRA_BASE_URL}/rest/api/2/issue" 2>&1)" || true
    http_code="$(printf '%s\n' "$response" | tail -n 1)"
    body="$(printf '%s\n' "$response" | sed '$d')"
    echo -e "${BLUE}Jira HTTP ${http_code}${NC}"
    echo "$body"
    if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
        JIRA_ISSUE_KEY="$(printf '%s' "$body" | sed -n 's/.*"key"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"
        JIRA_ISSUE_URL="${JIRA_BASE_URL}/browse/${JIRA_ISSUE_KEY}"
        JIRA_CREATE_STATUS="$JIRA_ISSUE_KEY"
        echo -e "${GREEN}Created ${JIRA_ISSUE_KEY}${NC}"
    else
        JIRA_CREATE_STATUS='failed'
    fi
fi

if [ -n "$JIRA_ISSUE_KEY" ]; then
    JIRA_LINK_LINE="$JIRA_ISSUE_URL"
else
    JIRA_LINK_LINE='n/a'
fi

SLACK_MSG=$(cat <<EOF
AO Bulk Export - Workflow Triggered ✅

━━━━━━━━━━━━━━━━━━━━
📋 RUN DETAILS
━━━━━━━━━━━━━━━━━━━━
👤 User:      ${USER_NAME}
🎫 Case ID:   ${CASE_ID}
🏢 Company:   ${COMPANY_NAME}
🏛 Entity:    ${ENTITY_DIR}

━━━━━━━━━━━━━━━━━━━━
📊 RESULTS
━━━━━━━━━━━━━━━━━━━━
🟢 Successful:       ${SUCCESS}
🟡 Skipped:          ${SKIPPED}
🔴 Failed:           ${FAILED}
📁 Files attempted:  ${TOTAL_FILES}
📂 Download folder:  ${ENTITY_DIR}

━━━━━━━━━━━━━━━━━━━━
🎫 JIRA
━━━━━━━━━━━━━━━━━━━━
🔗 Issue: ${JIRA_CREATE_STATUS}
🌐 Link:  ${JIRA_LINK_LINE}
EOF
)

slack_payload=$(printf '{"text":"%s"}' "$(json_escape "$SLACK_MSG")")
echo ""
echo -e "${BLUE}Slack payload preview:${NC}"
echo "$slack_payload"
echo ""

response="$(curl -sS -w $'\n%{http_code}' -X POST \
    -H 'Content-type: application/json; charset=utf-8' \
    --data-binary "$slack_payload" \
    "$SLACK_WEBHOOK_URL" 2>&1)" || true
http_code="$(printf '%s\n' "$response" | tail -n 1)"
body="$(printf '%s\n' "$response" | sed '$d')"
if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}Slack completion message sent.${NC}"
else
    echo -e "${YELLOW}Slack failed (${http_code}):${NC}"
    echo "$body"
fi

echo ""
echo -e "${GREEN}Smoke test complete.${NC}"
