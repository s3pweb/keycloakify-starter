#!/usr/bin/env bash
# Usage: e2e/run.sh <keycloakPort> <label>  — requires `make start-server` running (Keycloak + maildev)
# Login checks, then theme emails sent through the admin API (read back from maildev),
# then the required-action pages reached from the email link. Screenshots in e2e/screenshots/.
# Credentials default to keycloakify's local test values; override with KC_ADMIN_PASSWORD / KC_TEST_PASSWORD.
set -euo pipefail

DIR=$(dirname "$0")
BASE=http://localhost:${1:-8080}
LABEL=${2:-kc}
MAILDEV=http://localhost:1080/api/email
mkdir -p "$DIR/screenshots"

# stderr: still shown when called inside $(...)
fail() {
    echo "FAIL $*" >&2
    exit 1
}

for tool in curl jq node; do
    command -v "$tool" >/dev/null || fail "$tool is required (and Google Chrome for the browser checks)"
done

node "$DIR/login.mjs" "$BASE" "$LABEL"

TOKEN=$(curl -sf -d client_id=admin-cli -d username=admin -d "password=${KC_ADMIN_PASSWORD:-admin}" \
    -d grant_type=password "$BASE/realms/master/protocol/openid-connect/token" | jq -er .access_token) ||
    fail "no admin token from $BASE (is Keycloak running? KC_ADMIN_PASSWORD?)"
AUTH="Authorization: Bearer $TOKEN"
REALM=$BASE/admin/realms/myrealm
USER_ID=$(curl -sf -H "$AUTH" "$REALM/users?username=testuser&exact=true" | jq -er '.[0].id') ||
    fail "cannot read testuser from the admin API"

# Sends one email through the admin API, waits for it in maildev (20 s max) and prints all emails
send_mail() {
    local before mails
    before=$(curl -sf "$MAILDEV" | jq length) || fail "maildev not reachable at $MAILDEV"
    curl -sf -X PUT -H "$AUTH" "${@:2}" "$REALM/users/$USER_ID/$1" || fail "admin API $1"
    for _ in $(seq 20); do
        mails=$(curl -sf "$MAILDEV") || fail "maildev not reachable at $MAILDEV"
        if [ "$(jq length <<<"$mails")" -gt "$before" ]; then
            echo "$mails"
            return
        fi
        sleep 1
    done
    fail "no new email in maildev 20 s after $1"
}

# TODO: the maildev mailbox is shared: two concurrent test runs would clear each other's emails.
# Not reachable today (one Keycloak at a time, see makefile); give each run its own maildev if needed.
curl -sf -X DELETE "$MAILDEV/all" >/dev/null || fail "cannot clear maildev at $MAILDEV (is it running? make maildev)"
MAILS=$(send_mail execute-actions-email -H 'Content-Type: application/json' -d '["UPDATE_PASSWORD","CONFIGURE_TOTP"]')
[ "$(jq length <<<"$MAILS")" -eq 1 ] || fail "expected 1 email in maildev after execute-actions-email"
LINK=$(jq -r '.[0].text' <<<"$MAILS" | grep -oE 'https?://[^ ]+action-token[^ ]+' | head -1 || true)
[ -n "$LINK" ] || fail "no action-token link in the execute-actions email"

MAILS=$(send_mail send-verify-email)
[ "$(jq length <<<"$MAILS")" -eq 2 ] || fail "expected 2 emails in maildev after send-verify-email"
jq -r '.[] | "mail: \(.subject) | logo=\(.html|test("B2PConnect.com_fondfonceai")) | footer=\(.html|test("Nos solutions sont sur"))"' <<<"$MAILS"
jq -e 'all(.[]; (.html|test("B2PConnect.com_fondfonceai")) and (.html|test("Nos solutions sont sur")))' <<<"$MAILS" >/dev/null ||
    fail "an email is missing the B2PConnect logo or footer"

node "$DIR/required-actions.mjs" "$LINK" "$LABEL"
echo "ok   all e2e checks passed"
