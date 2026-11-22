import type { Response } from "@playwright/test";

import { uniqueToken, type RuleName, type TestAgent } from "./support/backend";
import { holdRequests, recordApiWrites } from "./support/network";
import { expect, test } from "./support/test";
import { openAgent } from "./support/ui";

const STANDARD: RuleName = "Gettone Residenziale Standard";

test.describe("agents", () => {
    test("should keep the parent and email cleared after a reload when they are removed and saved", async ({ page, backend }) => {
        const token = uniqueToken();
        const mail = `figlio-${token.toLowerCase()}@example.com`;
        const parent = await backend.createAgent({ name: `Padre ${token}`, ruleValues: { [STANDARD]: 10 } });
        const child = await backend.createAgent({ name: `Figlio ${token}`, parentName: parent.name, mail, ruleValues: { [STANDARD]: 6 } });
        const dialog = await openAgent(page, child);

        await expect(dialog.getByLabel("Email")).toHaveValue(mail);
        await dialog.getByLabel("Email").clear();
        await dialog.getByRole("combobox", { name: parent.name }).click();
        await page.getByRole("option", { name: "Nessun agente padre" }).click();
        await expect(dialog.getByRole("combobox", { name: "Nessun agente padre" })).toBeVisible();
        await dialog.getByRole("button", { name: "Salva" }).click();

        await expect(page.getByText("Agente aggiornato con successo", { exact: true })).toBeVisible();

        await page.reload();

        const reopened = await openAgent(page, child);

        await expect(reopened.getByRole("combobox", { name: "Nessun agente padre" })).toBeVisible();
        await expect(reopened.getByLabel("Email")).toHaveValue("");
    });

    test("should keep the opened agent's values when the values of an agent opened before arrive later", async ({ page, backend }) => {
        const token = uniqueToken();
        const first = await backend.createAgent({ name: `Primo ${token}`, ruleValues: { [STANDARD]: 11 } });
        const second = await backend.createAgent({ name: `Secondo ${token}`, ruleValues: { [STANDARD]: 22 } });
        const firstPath = `/api/${first.id}/configurazione-regole`;
        const release = await holdRequests(page, firstPath);
        const dialog = page.getByRole("dialog", { name: "Modifica Agente" });
        const standardValue = dialog.getByRole("tabpanel", { name: "Valori agente" }).getByRole("textbox");

        await page.goto("/#agenti");
        await page.getByPlaceholder("Filtra...").fill(token);
        await page.getByRole("button", { name: first.name, exact: true }).click();
        await expect(dialog).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await page.getByRole("button", { name: second.name, exact: true }).click();
        await dialog.getByRole("button", { name: STANDARD, exact: true }).click();
        await expect(standardValue).toHaveValue("22");

        const late = page.waitForResponse((response) => new URL(response.url()).pathname === firstPath);

        release();
        await (await late).finished();
        // Two frames give React time to render the late answer, had it been accepted.
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

        await expect(standardValue).toHaveValue("22");
    });

    test("should show the saved parent in the table when the agent is saved but its values are refused", async ({ page, backend }) => {
        const token = uniqueToken();
        const parent = await backend.createAgent({ name: `Padre ${token}`, ruleValues: { [STANDARD]: 10 } });
        const child = await backend.createAgent({ name: `Figlio ${token}`, parentName: parent.name, ruleValues: { [STANDARD]: 6 } });

        // The backend can't refuse the values on demand, so only that write is replaced with a server error.
        await page.route(`**/api/${child.id}/configurazione-regole`, (route) =>
            route.request().method() === "POST" ? route.fulfill({ status: 500, json: { error: "Errore simulato: valori rifiutati" } }) : route.fallback(),
        );

        const dialog = await openAgent(page, child);

        await dialog.getByRole("combobox", { name: parent.name }).click();
        await page.getByRole("option", { name: "Nessun agente padre" }).click();
        await dialog.getByRole("button", { name: "Salva" }).click();

        await expect(page.getByText("Errore simulato: valori rifiutati", { exact: true })).toBeVisible();

        await dialog.getByRole("button", { name: "Annulla" }).click();
        await expect(dialog).toBeHidden();

        const row = page.getByRole("row").filter({ has: page.getByRole("checkbox", { name: `Statistiche ${child.name}`, exact: true }) });

        await expect(row).toBeVisible();
        await expect(row.getByRole("cell", { name: parent.name, exact: true })).toHaveCount(0);
    });

    test("should keep asking to confirm an agent deletion after a cancel and stop asking after a confirm when Non mostrare più is ticked", async ({
        page,
        backend,
    }) => {
        const token = uniqueToken();
        const first = await backend.createAgent({ name: `Primo ${token}`, ruleValues: { [STANDARD]: 1 } });
        const second = await backend.createAgent({ name: `Secondo ${token}`, ruleValues: { [STANDARD]: 1 } });
        const kept = await backend.createAgent({ name: `Terzo ${token}`, ruleValues: { [STANDARD]: 1 } });
        const confirmation = page.getByRole("alertdialog", { name: "Sei sicuro di voler eliminare questo agente?" });
        const writes = recordApiWrites(page);

        const deleted = (agent: TestAgent): Promise<Response> =>
            page.waitForResponse((response) => response.request().method() === "DELETE" && new URL(response.url()).pathname === `/api/agenti/${agent.id}`);

        const firstDialog = await openAgent(page, first);

        await firstDialog.getByRole("button", { name: "Elimina Agente" }).click();
        await confirmation.getByRole("checkbox", { name: "Non mostrare più" }).check();
        await confirmation.getByRole("button", { name: "Annulla" }).click();
        await expect(confirmation).toBeHidden();

        await firstDialog.getByRole("button", { name: "Elimina Agente" }).click();
        await expect(confirmation).toBeVisible();
        expect(writes).toEqual([]);

        const firstDeleted = deleted(first);

        await confirmation.getByRole("checkbox", { name: "Non mostrare più" }).check();
        await confirmation.getByRole("button", { name: "Elimina Agente" }).click();
        expect((await firstDeleted).ok()).toBe(true);
        backend.untrackAgent(first.id);

        const secondDialog = await openAgent(page, second);
        const secondDeleted = deleted(second);

        await secondDialog.getByRole("button", { name: "Elimina Agente" }).click();

        await expect(page.getByRole("alertdialog")).toHaveCount(0);
        expect((await secondDeleted).ok()).toBe(true);
        backend.untrackAgent(second.id);

        await page.reload();
        await page.getByPlaceholder("Filtra...").fill(token);

        await expect(page.getByRole("checkbox", { name: `Statistiche ${kept.name}`, exact: true })).toBeVisible();
        await expect(page.getByRole("checkbox", { name: new RegExp(`^Statistiche .*${token}`) })).toHaveCount(1);
    });
});
