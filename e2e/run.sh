#!/usr/bin/env bash
# Usage: e2e/run.sh <keycloakPort> <label>  — requires `make start-server` running (Keycloak + maildev)
# Login checks, then theme emails sent through the admin API (read back from maildev),
# then the required-action pages reached from the email link. Screenshots in e2e/screenshots/.
set -euo pipefail

DIR=$(dirname "$0")
BASE=http://localhost:${1:-8080}
LABEL=${2:-kc}
MAILDEV=http://localhost:1080/api/email
mkdir -p "$DIR/screenshots"

node "$DIR/login.mjs" "$BASE" "$LABEL"

TOKEN=$(curl -sf -d client_id=admin-cli -d username=admin -d password=admin -d grant_type=password \
    "$BASE/realms/master/protocol/openid-connect/token" | jq -r .access_token)
AUTH="Authorization: Bearer $TOKEN"
REALM=$BASE/admin/realms/myrealm
USER_ID=$(curl -sf -H "$AUTH" "$REALM/users?username=testuser&exact=true" | jq -r '.[0].id')

curl -s -X DELETE "$MAILDEV/all" >/dev/null
curl -sf -X PUT -H "$AUTH" -H 'Content-Type: application/json' -d '["UPDATE_PASSWORD","CONFIGURE_TOTP"]' \
    "$REALM/users/$USER_ID/execute-actions-email"
curl -sf -X PUT -H "$AUTH" "$REALM/users/$USER_ID/send-verify-email"
sleep 2

MAILS=$(curl -sf "$MAILDEV")
echo "$MAILS" | jq -r '.[] | "mail: \(.subject) | logo=\(.html|test("B2PConnect.com_fondfonceai")) | footer=\(.html|test("Nos solutions sont sur"))"'
[ "$(echo "$MAILS" | jq 'length')" -eq 2 ] || { echo "expected 2 emails in maildev"; exit 1; }

LINK=$(echo "$MAILS" | jq -r '.[] | .text' | grep -oE "$BASE/[^ ]+action-token[^ ]+" | head -1)
node "$DIR/required-actions.mjs" "$LINK" "$LABEL"
