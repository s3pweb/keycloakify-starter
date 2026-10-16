.PHONY: help start-server maildev stop-maildev save-server-realm test-e2e

KC_VERSION ?= 26.8.1
KC_PORT ?= 8080
LABEL ?= kc

help:
	@echo "Available commands :"
	@echo "  make start-server [KC_VERSION=26.8.1] [KC_PORT=8080]  Keycloak + theme (keycloakify start-keycloak) + maildev"
	@echo "  make maildev / stop-maildev                         Fake SMTP server, UI on http://localhost:1080"
	@echo "  make save-server-realm [SAVE_KC_VERSION=24]         Copy the realm edited in the admin console to realm/realm.json (default: Keycloak run last)"
	@echo "  make test-e2e [KC_PORT=8080] [LABEL=kc]             Browser + email checks against the running server (needs Chrome, curl, jq)"
	@echo "One Keycloak at a time: keycloakify reuses the container name, a new start-server stops the running one"
	@echo "Test user : testuser / password123 — admin console : admin / admin"

start-server: maildev
	npx keycloakify start-keycloak --keycloak-version $(KC_VERSION) --port $(KC_PORT)

maildev:
	@docker network inspect keycloakify-test >/dev/null 2>&1 || docker network create keycloakify-test >/dev/null
	@docker start maildev >/dev/null 2>&1 || docker run -d --name maildev --network keycloakify-test -p 1080:1080 -p 1025:1025 maildev/maildev
	@docker network connect keycloakify-test maildev 2>/dev/null || true
	@echo "FAKE SMTP SERVER : open http://localhost:1080"

stop-maildev:
	docker rm -f maildev

save-server-realm:
	node scripts/save-server-realm.mjs $(SAVE_KC_VERSION)

test-e2e:
	bash e2e/run.sh $(KC_PORT) $(LABEL)
