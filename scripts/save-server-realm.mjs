// Copies the realm saved by `keycloakify start-keycloak` (.keycloakify/realm-kc-<major>.json)
// to realm/realm.json, without secrets: realm keys, user passwords (both regenerated at import),
// client secrets, SMTP password, identity provider client secrets and LDAP bind credentials.
// realm/realm.json is a test fixture only (it keeps keycloakify's dev settings: sslRequired none,
// keycloakify-logging listener…): never import it into a real server.
// Without argument, takes the most recently written file, i.e. the Keycloak run (and edited) last.
// TODO: the saved file uses the export format of its Keycloak major; importing it into an older
// major (e.g. 26 → 24, the prod version) may fail — only a warning for now; drop it once prod runs
// Keycloak 26.
/* global process */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";

const OLDEST_TESTED_MAJOR = 24;
const dir = ".keycloakify";
const major = process.argv[2]?.split(".")[0] ?? lastRunMajor();
const realm = JSON.parse(readFileSync(`${dir}/realm-kc-${major}.json`, "utf8"));

function lastRunMajor() {
    const files = readdirSync(dir).filter(f => /^realm-kc-\d+\.json$/.test(f));
    if (files.length === 0)
        throw new Error(`no realm in ${dir}/: run make start-server first`);
    const mtime = f => statSync(`${dir}/${f}`).mtimeMs;
    return files.sort((a, b) => mtime(b) - mtime(a))[0].match(/\d+/)[0];
}

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
for (const federation of realm.components?.["org.keycloak.storage.UserStorageProvider"] ??
    []) {
    delete federation.config?.bindCredential; // LDAP / AD bind password
}

writeFileSync("realm/realm.json", JSON.stringify(realm, null, 2) + "\n");
console.log(`realm/realm.json updated from Keycloak ${major}`);
if (Number(major) > OLDEST_TESTED_MAJOR) {
    console.warn(
        `WARNING: exported by Keycloak ${major}, it may not import into Keycloak ${OLDEST_TESTED_MAJOR} (prod version)`
    );
}
