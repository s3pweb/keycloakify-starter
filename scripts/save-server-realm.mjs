// Copies the realm saved by `keycloakify start-keycloak` (.keycloakify/realm-kc-<major>.json)
// to realm/realm.json, without the realm keys and user passwords (regenerated at import).
// TODO: the saved file uses the export format of the given Keycloak major; importing it
// into an older major (e.g. 26 → 24) may fail — save from the oldest version you test.
/* global process */
import { readFileSync, writeFileSync } from "node:fs";

const major = (process.argv[2] ?? "26").split(".")[0];
const realm = JSON.parse(readFileSync(`.keycloakify/realm-kc-${major}.json`, "utf8"));

delete realm.components?.["org.keycloak.keys.KeyProvider"];
for (const user of realm.users ?? []) {
    user.credentials = [];
}

writeFileSync("realm/realm.json", JSON.stringify(realm, null, 2) + "\n");
console.log(`realm/realm.json updated from Keycloak ${major}`);
