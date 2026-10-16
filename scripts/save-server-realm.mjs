// Copies the realm saved by `keycloakify start-keycloak` (.keycloakify/realm-kc-<major>.json)
// to realm/realm.json, without secrets: realm keys, user passwords (both regenerated at import),
// client secrets, SMTP password and identity provider client secrets.
// TODO: the saved file uses the export format of the given Keycloak major; importing it
// into an older major (e.g. 26 → 24) may fail — the makefile saves from 24.0.5 (prod) by default;
// switch SAVE_KC_VERSION to 26 once production runs Keycloak 26.
/* global process */
import { readFileSync, writeFileSync } from "node:fs";

const major = (process.argv[2] ?? "24").split(".")[0];
const realm = JSON.parse(readFileSync(`.keycloakify/realm-kc-${major}.json`, "utf8"));

delete realm.components?.["org.keycloak.keys.KeyProvider"];
for (const user of realm.users ?? []) {
    user.credentials = [];
}
for (const client of realm.clients ?? []) {
    delete client.secret;
}
delete realm.smtpServer?.password;
for (const idp of realm.identityProviders ?? []) {
    delete idp.config?.clientSecret;
}

writeFileSync("realm/realm.json", JSON.stringify(realm, null, 2) + "\n");
console.log(`realm/realm.json updated from Keycloak ${major}`);
