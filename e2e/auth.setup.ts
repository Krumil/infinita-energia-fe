import { expect, test as setup, type APIResponse } from "@playwright/test";

import { expectBackendDatabase } from "./support/backend";
import { AUTH_FILE, BACKEND_URL, requiredEnv } from "./support/env";

setup("should sign in through the login form when the backend is running", async ({ page, request }) => {
    const username = requiredEnv("E2E_USERNAME");
    const password = requiredEnv("E2E_PASSWORD");

    let health: APIResponse;

    try {
        health = await request.get(`${BACKEND_URL}/health`);
    } catch (error) {
        throw new Error(`The backend at ${BACKEND_URL} is not reachable. Start it with \`python Run.py\` first.`, { cause: error });
    }

    expect(health.ok(), `GET ${BACKEND_URL}/health returned ${health.status()}`).toBe(true);

    await page.goto("/");
    await page.getByLabel("Nome utente").fill(username);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Accedi" }).click();
    await expect(page.getByLabel("Nome utente")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    await expectBackendDatabase(page.request);

    await page.context().storageState({ path: AUTH_FILE });
});
