import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { keycloakify } from "keycloakify/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        keycloakify({
            accountThemeImplementation: "none",
            themeName: ["b2pconnect"],
            // Keycloak 26 only: no jar for Keycloak 22-25 (it would embed an extension that Keycloak 26 does not need)
            keycloakVersionTargets: {
                "22-to-25": false,
                "all-other-versions": true
            },
            startKeycloakOptions: {
                realmJsonFilePath: "./realm/realm.json",
                // Shared network with maildev (realm SMTP host "maildev"), created by `make maildev`:
                // start Keycloak with `make start-server`, not `npx keycloakify start-keycloak` directly
                dockerExtraArgs: ["--network=keycloakify-test"]
            }
        })
    ]
});
