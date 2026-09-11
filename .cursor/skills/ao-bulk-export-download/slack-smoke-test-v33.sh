#!/bin/bash

set -e

##############################################
# AO Bulk Export — Slack Completion Smoke Test (V3.3)
#
# Created by:
# Arham Dharewa
#
# Does NOT download files.
# Prompts for user / case / company / entity,
# then posts ONE Slack completion message.
##############################################

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

DEFAULT_ENTITY='Slack Smoke Test'
SUCCESS=0
SKIPPED=11
FAILED=0
TOTAL_FILES=11

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

build_slack_payload() {
    local msg="$1"
    # Bash-only — avoid macOS python3 Xcode stub
    printf '{"text":"%s"}' "$(json_escape "$msg")"
}

notify_slack() {
    local msg="$1"
    local payload response http_code body
    [ -z "$SLACK_WEBHOOK_URL" ] && return 0
    payload="$(build_slack_payload "$msg")" || {
        echo -e "${YELLOW}Slack payload build failed.${NC}"
        return 0
    }
    echo -e "${BLUE}Payload preview:${NC}"
    echo "$payload"
    echo ""
    response="$(curl -sS -w $'\n%{http_code}' -X POST \
        -H 'Content-type: application/json; charset=utf-8' \
        --data-binary "$payload" \
        "$SLACK_WEBHOOK_URL" 2>&1)" || true
    http_code="$(printf '%s\n' "$response" | tail -n 1)"
    body="$(printf '%s\n' "$response" | sed '$d')"
    if [ "$http_code" = "200" ]; then
        echo -e "${BLUE}Slack completion message sent.${NC}"
    else
        echo -e "${YELLOW}Slack completion message did not trigger.${NC}"
        echo -e "${YELLOW}Slack response code: ${http_code}${NC}"
        echo -e "${YELLOW}Slack response body:${NC}"
        echo "$body"
    fi
}

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}AO Slack Completion Smoke Test V3.3${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""
echo -e "${BLUE}Enter run details${NC}"
echo ""

while [ -z "${USER_NAME:-}" ]; do
    read -r -p "User name: " USER_NAME
done
while [ -z "${CASE_ID:-}" ]; do
    read -r -p "Case ID: " CASE_ID
done
while [ -z "${COMPANY_NAME:-}" ]; do
    read -r -p "Company name: " COMPANY_NAME
done
while [ -z "${ENTITY_DIR:-}" ]; do
    read -r -p "Entity name [$DEFAULT_ENTITY]: " ENTITY_INPUT
    ENTITY_DIR="${ENTITY_INPUT:-$DEFAULT_ENTITY}"
done

if [ "$FAILED" -gt 0 ]; then
    TITLE_EMOJI='⚠️'
    ACTION_LINE='⚠️ Action needed: one or more downloads failed — re-check before upload.'
else
    TITLE_EMOJI='✅'
    ACTION_LINE=''
fi

SLACK_MSG=$(cat <<EOF
AO Bulk Export - Workflow Triggered ${TITLE_EMOJI}

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
${ACTION_LINE:+
${ACTION_LINE}}
EOF
)

echo ""
echo -e "${BLUE}Preview:${NC}"
echo "$SLACK_MSG"
echo ""

notify_slack "$SLACK_MSG"

echo ""
echo -e "${GREEN}Smoke test complete.${NC}"
