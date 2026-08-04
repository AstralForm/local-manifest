#!/bin/bash

set -e

##############################################
# AO Bulk Export — Slack Smoke Test (V3.2)
#
# Does NOT download files.
# Only posts sample progress messages to Slack
# so you can verify the webhook end-to-end.
##############################################

GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

ENTITY_DIR='Slack Smoke Test'
TOTAL_FILES=3

SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-https://hooks.slack.com/triggers/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}"

json_escape() {
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/	/\\t/g' | awk '{printf "%s\\n", $0}' | sed 's/\\n$//'
}

notify_slack() {
    local msg="$1"
    local payload
    payload="{\"text\":\"$(json_escape "$msg")\"}"
    echo -e "${BLUE}Slack ←${NC} $msg"
    curl -sS -X POST \
        -H 'Content-type: application/json' \
        --data "$payload" \
        "$SLACK_WEBHOOK_URL"
    echo ""
}

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}AO Slack Smoke Test V3.2${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""

notify_slack "AO Bulk Export started: $ENTITY_DIR ($TOTAL_FILES files)"
sleep 1
notify_slack "[1/$TOTAL_FILES] ✓ PAYSTUB downloaded — $ENTITY_DIR"
sleep 1
notify_slack "[2/$TOTAL_FILES] Skipping HUB (already exists) — $ENTITY_DIR"
sleep 1
notify_slack "[3/$TOTAL_FILES] ✗ Failed to download W2 — $ENTITY_DIR"
sleep 1
notify_slack "AO Bulk Export done: $ENTITY_DIR — Successful: 1 | Skipped: 1 | Failed: 1"

echo ""
echo -e "${GREEN}Smoke test complete. Check your Slack channel/workflow.${NC}"
