import { test as base, expect } from "@playwright/test";

import { Backend } from "./backend";
import { APP_URL, AUTH_FILE } from "./env";

export type AppLanguage = "it" | "en";

// The month pickers open on the current year. A 2031 clock keeps every month the suite touches away from real data.
const FIXED_NOW = new Date("2031-06-15T10:00:00");

interface Fixtures {
    appLanguage: AppLanguage;
    backend: Backend;
}

// Fixture callbacks name their continuation `provide` because eslint-plugin-react-hooks treats a function called `use` as React's hook.
export const test = base.extend<Fixtures>({
    appLanguage: ["it", { option: true }],
    page: async ({ page, appLanguage }, provide) => {
        await page.clock.setFixedTime(FIXED_NOW);
        await page.addInitScript((language) => localStorage.setItem("app-language", language), appLanguage);
        await provide(page);
    },
    backend: async ({ playwright, userAgent }, provide) => {
        const api = await playwright.request.newContext({ baseURL: APP_URL, storageState: AUTH_FILE, userAgent });

        try {
            const backend = new Backend(api);

            await provide(backend);
            await backend.cleanUp();
        } finally {
            await api.dispose();
        }
    },
});

export { expect };
