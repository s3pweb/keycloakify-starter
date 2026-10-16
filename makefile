.PHONY: help start-server maildev stop-maildev save-server-realm

KC_VERSION ?= 26.8.1
KC_PORT ?= 8080

help:
	@echo "Available commands :"
	@echo "  make start-server [KC_VERSION=26.8.1] [KC_PORT=8080]  Keycloak + theme (keycloakify start-keycloak) + maildev"
	@echo "  make maildev / stop-maildev                         Fake SMTP server, UI on http://localhost:1080"
	@echo "  make save-server-realm [KC_VERSION=26.8.1]          Copy the realm edited in the admin console to realm/realm.json"
	@echo "Test user : testuser / password123 — admin console : admin / admin"

start-server: maildev
	npx keycloakify start-keycloak --keycloak-version $(KC_VERSION) --port $(KC_PORT)

maildev:
	@docker start maildev >/dev/null 2>&1 || docker run -d --name maildev -p 1080:1080 -p 1025:1025 maildev/maildev
	@echo "FAKE SMTP SERVER : open http://localhost:1080"

stop-maildev:
	docker rm -f maildev

save-server-realm:
	node scripts/save-server-realm.mjs $(KC_VERSION)
