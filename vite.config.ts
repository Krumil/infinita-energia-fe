import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import packageJson from "./package.json";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    define: {
        __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    server: {
        host: "0.0.0.0",
        proxy: {
            "/api": {
                target: "http://localhost:5000",
                changeOrigin: true,
            },
        },
    },
});
