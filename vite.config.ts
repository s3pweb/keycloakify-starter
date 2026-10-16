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
            startKeycloakOptions: {
                realmJsonFilePath: "./realm/realm.json",
                // Shared network with maildev (realm SMTP host "maildev"), created by `make maildev`:
                // start Keycloak with `make start-server`, not `npx keycloakify start-keycloak` directly
                dockerExtraArgs: ["--network=keycloakify-test"]
            }
        })
    ]
});
