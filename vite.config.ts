import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { keycloakify } from "keycloakify/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        keycloakify({
            accountThemeImplementation: "none",
            themeName: ["b2pconnect-k10"],
            keycloakVersionTargets: {
                "21-and-below": false,
                "22-and-above": "b2pconnect-theme-v22-and-above.jar"
            },
            keycloakifyBuildDirPath: "./keycloak-theme-dist"
        })
    ]
});
