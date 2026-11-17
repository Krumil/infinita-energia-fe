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

    test("should reverse the agent order each time the Nome Agente header is clicked", async ({ page, backend }) => {
        const token = uniqueToken();
        const first = await backend.createAgent({ name: `Alfa ${token}`, ruleValues: { [STANDARD]: 10 } });
        const second = await backend.createAgent({ name: `Beta ${token}`, ruleValues: { [STANDARD]: 10 } });

        await page.goto("/#agenti");
        await page.getByPlaceholder("Filtra...").fill(token);

        const header = page.getByRole("columnheader", { name: "Nome Agente", exact: true });
        const names = page.getByRole("table").getByRole("button", { name: token });

        await expect(header).toHaveAttribute("aria-sort", "ascending");
        await expect(names).toHaveText([first.name, second.name]);

        await header.getByRole("button", { name: "Nome Agente", exact: true }).click();

        await expect(header).toHaveAttribute("aria-sort", "descending");
        await expect(names).toHaveText([second.name, first.name]);

        await header.getByRole("button", { name: "Nome Agente", exact: true }).click();

        await expect(header).toHaveAttribute("aria-sort", "ascending");
        await expect(names).toHaveText([first.name, second.name]);
    });

    test("should show and filter by the parent's name as written when its words are not in alphabetical order", async ({ page, backend }) => {
        const token = uniqueToken();
        // The child stores its parent by the words sorted, so "PADRE E2E..." is kept as "E2E... PADRE".
        const parent = await backend.createAgent({ name: `Padre ${token}`, ruleValues: { [STANDARD]: 10 } });
        const child = await backend.createAgent({ name: `Figlio ${token}`, parentName: parent.name, ruleValues: { [STANDARD]: 6 } });

        await page.goto("/#agenti");
        await page.getByRole("combobox", { name: "Tutti gli agenti padre" }).click();
        await page.getByPlaceholder("Cerca agente padre...").fill(parent.name);
        await page.getByRole("option", { name: parent.name, exact: true }).click();

        const row = page.getByRole("row").filter({ has: page.getByRole("button", { name: child.name, exact: true }) });

        await expect(row.getByRole("cell", { name: parent.name, exact: true })).toBeVisible();
        await expect(page.getByRole("row")).toHaveCount(2);
    });

    test("should select the highlighted option when Enter is pressed in the parent search", async ({ page, backend }) => {
        const token = uniqueToken();
        const parent = await backend.createAgent({ name: `Padre ${token}`, ruleValues: { [STANDARD]: 10 } });
        const child = await backend.createAgent({ name: `Figlio ${token}`, ruleValues: { [STANDARD]: 6 } });
        const dialog = await openAgent(page, child);

        await dialog.getByRole("combobox", { name: "Nessun agente padre" }).click();
        await page.getByPlaceholder("Cerca agente padre...").fill(parent.name);
        await page.keyboard.press("Enter");

        await expect(dialog.getByRole("combobox", { name: parent.name })).toBeVisible();

        await dialog.getByRole("combobox", { name: parent.name }).click();
        await page.getByPlaceholder("Cerca agente padre...").fill("nessun");
        await page.keyboard.press("Enter");

        await expect(dialog.getByRole("combobox", { name: "Nessun agente padre" })).toBeVisible();
    });

    test("should show the clear option without the empty message when the search matches it", async ({ page, backend }) => {
        const agent = await backend.createAgent({ name: `Agente ${uniqueToken()}`, ruleValues: { [STANDARD]: 6 } });
        const dialog = await openAgent(page, agent);

        await dialog.getByRole("combobox", { name: "Nessun agente padre" }).click();
        await page.getByPlaceholder("Cerca agente padre...").fill("nessun");

        await expect(page.getByRole("option", { name: "Nessun agente padre", exact: true })).toBeVisible();
        await expect(page.getByText("Nessun agente padre trovato", { exact: true })).toHaveCount(0);

        await page.getByPlaceholder("Cerca agente padre...").fill("zzzz-no-match");

        await expect(page.getByText("Nessun agente padre trovato", { exact: true })).toBeVisible();
    });

    test("should open the agent dialog from the keyboard when Enter is pressed on the agent name", async ({ page, backend }) => {
        const agent = await backend.createAgent({ name: `Agente ${uniqueToken()}`, ruleValues: { [STANDARD]: 6 } });

        await page.goto("/#agenti");
        await page.getByPlaceholder("Filtra...").fill(agent.name);
        await page.getByRole("button", { name: agent.name, exact: true }).focus();
        await page.keyboard.press("Enter");

        await expect(page.getByRole("dialog", { name: "Modifica Agente" })).toBeVisible();
    });

    test("should return focus to the control that opened the dialog when the edit or new agent dialog is closed", async ({ page, backend }) => {
        const agent = await backend.createAgent({ name: `Agente ${uniqueToken()}`, ruleValues: { [STANDARD]: 6 } });

        await page.goto("/#agenti");
        await page.getByPlaceholder("Filtra...").fill(agent.name);

        const name = page.getByRole("button", { name: agent.name, exact: true });
        const add = page.getByRole("button", { name: "Aggiungi Agente" });

        await name.click();
        await expect(page.getByRole("dialog", { name: "Modifica Agente" })).toBeVisible();
        await page.keyboard.press("Escape");

        await expect(page.getByRole("dialog")).toBeHidden();
        await expect(name).toBeFocused();

        await add.click();
        await expect(page.getByRole("dialog", { name: "Aggiungi Agente" })).toBeVisible();
        await page.keyboard.press("Escape");

        await expect(page.getByRole("dialog")).toBeHidden();
        await expect(add).toBeFocused();
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

    test("should show a translated message instead of the status line when the agent list fails with a 502 without a message", async ({ page }) => {
        await page.route("**/api/agenti", (route) =>
            route.request().method() === "GET" ? route.fulfill({ status: 502, body: "Bad Gateway", contentType: "text/plain" }) : route.fallback(),
        );
        await page.goto("/#agenti");

        await expect(page.getByText("Il server ha riscontrato un errore. Riprova tra poco.", { exact: true })).toBeVisible();
        await expect(page.getByText(/HTTP 502/)).toHaveCount(0);
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
