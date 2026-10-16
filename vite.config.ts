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
                // Lets Keycloak reach maildev (SMTP host.docker.internal:1025) on Linux
                dockerExtraArgs: ["--add-host=host.docker.internal:host-gateway"]
            }
        })
    ]
});
