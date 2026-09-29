import { defineConfig, devices } from "@playwright/test";

import { APP_URL, AUTH_FILE, E2E_PORT } from "./e2e/support/env";

export default defineConfig({
    testDir: "./e2e",
    // Every test reads and writes the same local database, so they run one at a time.
    fullyParallel: false,
    workers: 1,
    forbidOnly: true,
    reporter: [["list"], ["html", { open: "never" }]],
    use: {
        // The login and every later client share one user agent. Flask-Login re-signs the session cookie for a client
        // that looks different from the one that logged in, and a cookie re-signed just before the clock steps back is rejected.
        ...devices["Desktop Chrome"],
        baseURL: APP_URL,
        trace: "retain-on-failure",
        viewport: { width: 1280, height: 900 },
    },
    projects: [
        { name: "setup", testMatch: /auth\.setup\.ts/ },
        {
            name: "chromium",
            use: { storageState: AUTH_FILE },
            dependencies: ["setup"],
        },
    ],
    webServer: {
        command: `npm run dev -- --host 0.0.0.0 --port ${E2E_PORT} --strictPort`,
        url: APP_URL,
        reuseExistingServer: true,
        // The backend only accepts CORS from deployed origins in dev, so the app must call it through the Vite proxy.
        env: { VITE_API_BASE: `${APP_URL}/api` },
    },
});
