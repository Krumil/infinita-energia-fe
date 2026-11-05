import type { Locator, Page } from "@playwright/test";

import { Backend, uniqueToken, type InviteDetail, type TestAgent } from "./support/backend";
import { agentRow } from "./support/calculation";
import { expect, test } from "./support/test";
import { openTab } from "./support/ui";

const INVITE_MONTH = "2032-01";

interface InvitePatch {
    pagato?: boolean;
    data_fattura?: string;
    data_pagamento?: string;
    riferimento_fattura?: string;
}

interface AttachmentFixture {
    id: number;
    storico_invito_id: number;
    nome_file: string;
    content_type: string;
    chiave_oggetto: string;
    dimensione_bytes: number;
    stato: "caricato";
    data_creazione: string;
    data_caricamento: string;
}

function detailRow(agent: TestAgent): InviteDetail {
    return {
        venditore: agent.name,
        comp_al: "2032-01-31",
        regola: "Gettone Residenziale Standard",
        importo_provvigione: 1,
        pod_pdr: "IT001E00000000",
        cliente: `Cliente ${agent.id}`,
        cf_piva: "E2ETST80A01H501A",
    };
}

async function seedAndOpen(page: Page, backend: Backend, patch?: InvitePatch): Promise<{ agent: TestAgent; inviteId: number; dialog: Locator; opener: Locator }> {
    const token = uniqueToken();
    const agent = await backend.createAgent({ name: `Dialogo ${token}`, ruleValues: {} });
    const inviteId = await backend.seedInvite(INVITE_MONTH, agent, [detailRow(agent)], "bozza");

    if (patch) {
        const arranged = await page.request.put(`/api/storico-inviti/${inviteId}`, { data: patch });

        expect(arranged.ok(), `PUT /api/storico-inviti/${inviteId}: ${await arranged.text()}`).toBe(true);
    }

    await page.goto("/");
    await openTab(page, "Inviti");
    await page.getByRole("textbox", { name: "Filtra..." }).fill(token);
    await expect(agentRow(page, agent)).toBeVisible();

    const opener = page.getByRole("button", { name: agent.name, exact: true });

    await opener.click();

    const dialog = page.getByRole("dialog", { name: agent.name });

    await expect(dialog).toBeVisible();

    return { agent, inviteId, dialog, opener };
}

function attachment(id: number, inviteId: number, name: string, bytes: number, uploadedAt: string): AttachmentFixture {
    return {
        id,
        storico_invito_id: inviteId,
        nome_file: name,
        content_type: "application/pdf",
        chiave_oggetto: `e2e/${id}`,
        dimensione_bytes: bytes,
        stato: "caricato",
        data_creazione: uploadedAt,
        data_caricamento: uploadedAt,
    };
}

test.describe("invite dialog", () => {
    test("should return focus to the invite's name when the dialog closes", async ({ page, backend }) => {
        const { dialog, opener } = await seedAndOpen(page, backend);

        await page.keyboard.press("Escape");

        await expect(dialog).toBeHidden();
        await expect(opener).toBeFocused();
    });

    test("should show an error and send nothing when the payment date is before the invoice date", async ({ page, backend }) => {
        // Both dates are set through the API so the picker only has to move the invoice date past the payment date.
        const { inviteId, dialog } = await seedAndOpen(page, backend, { pagato: true, data_fattura: "2031-01-05", data_pagamento: "2031-01-10" });

        const updates: string[] = [];

        page.on("request", (request) => {
            if (request.method() === "PUT" && request.url().endsWith(`/api/storico-inviti/${inviteId}`)) updates.push(request.url());
        });

        const editor = dialog;

        await editor.getByRole("button", { name: "Data Fattura" }).click();
        await page.getByRole("button", { name: /15/ }).click();

        await expect(editor.getByText("La data di pagamento non può essere precedente alla data fattura.")).toBeVisible();

        await editor.getByRole("button", { name: "Salva" }).click();

        await expect(editor.getByText("La data di pagamento non può essere precedente alla data fattura.")).toBeVisible();
        expect(updates).toEqual([]);
    });

    test("should keep the dialog title uncovered when the invoice date calendar opens", async ({ page, backend }) => {
        const { agent, dialog } = await seedAndOpen(page, backend);

        await dialog.getByRole("button", { name: "Data Fattura" }).click();

        const calendar = page.getByRole("grid");
        const title = dialog.getByRole("heading", { name: agent.name });

        await expect(calendar).toBeVisible();

        const calendarBox = await calendar.boundingBox();
        const titleBox = await title.boundingBox();

        expect(calendarBox, "calendar has a box").not.toBeNull();
        expect(titleBox, "title has a box").not.toBeNull();
        expect(calendarBox!.y, "calendar starts below the title").toBeGreaterThanOrEqual(titleBox!.y + titleBox!.height);
    });

    test("should offer years up to ten years ahead when the invoice date calendar opens", async ({ page, backend }) => {
        const { dialog } = await seedAndOpen(page, backend);
        const thisYear = await page.evaluate(() => new Date().getFullYear());

        await dialog.getByRole("button", { name: "Data Fattura" }).click();

        const years = page.getByRole("combobox", { name: "Choose the Year" });

        await expect(years.getByRole("option", { name: String(thisYear + 10), exact: true })).toHaveCount(1);
        await expect(years.getByRole("option", { name: String(thisYear + 11), exact: true })).toHaveCount(0);
        await expect(years.getByRole("option", { name: String(thisYear - 100), exact: true })).toHaveCount(1);
    });

    test("should clear the invoice reference when the operator empties it and saves", async ({ page, backend }) => {
        const { agent, dialog } = await seedAndOpen(page, backend, { riferimento_fattura: "FT-E2E-1" });

        await expect(dialog.getByLabel("Rif. Fattura")).toHaveValue("FT-E2E-1");
        await dialog.getByLabel("Rif. Fattura").clear();
        await dialog.getByRole("button", { name: "Salva" }).click();

        await expect(dialog).toBeHidden();

        const stored = await page.request.get(`/api/storico-inviti?agente_id=${agent.id}`);

        expect(await stored.json()).toMatchObject([{ riferimento_fattura: null }]);
    });

    test("should show a translated message instead of the server's text when saving fails with a 500", async ({ page, backend }) => {
        const { inviteId, dialog } = await seedAndOpen(page, backend);

        await page.route(`**/api/storico-inviti/${inviteId}`, (route) =>
            route.request().method() === "PUT" ? route.fulfill({ status: 500, body: "boom", contentType: "text/plain" }) : route.fallback(),
        );
        await dialog.getByRole("button", { name: "Salva" }).click();

        await expect(dialog.getByRole("alert")).toHaveText("Il server ha riscontrato un errore. Riprova tra poco.");
        await expect(dialog.getByText(/HTTP 500/)).toHaveCount(0);
    });
});

test.describe("invite attachments", () => {
    test("should list attachments newest first with size and upload date when the tab opens", async ({ page, backend }) => {
        const token = uniqueToken();
        const agent = await backend.createAgent({ name: `Allegati ${token}`, ruleValues: {} });
        const inviteId = await backend.seedInvite(INVITE_MONTH, agent, [detailRow(agent)], "bozza");

        await page.route(`**/api/storico-inviti/${inviteId}/allegati`, (route) =>
            route.fulfill({
                json: [
                    attachment(1, inviteId, "vecchio.pdf", 10, "2032-01-10T12:00:00Z"),
                    attachment(2, inviteId, "nuovo.pdf", 2048, "2032-01-20T12:00:00Z"),
                ],
            }),
        );
        await page.goto("/");
        await openTab(page, "Inviti");
        await page.getByRole("textbox", { name: "Filtra..." }).fill(token);
        await page.getByRole("button", { name: agent.name, exact: true }).click();
        await page.getByRole("tab", { name: "Allegati" }).click();

        const rows = page.getByRole("dialog").getByRole("row").filter({ hasText: ".pdf" });

        await expect(rows).toHaveCount(2);
        await expect(rows.nth(0)).toContainText("nuovo.pdf");
        await expect(rows.nth(0)).toContainText("2 KB");
        await expect(rows.nth(0)).toContainText(/20\/01\/32/);
        await expect(rows.nth(1)).toContainText("vecchio.pdf");
        await expect(rows.nth(1)).toContainText("10 B");
        await expect(page.getByRole("button", { name: "Elimina: nuovo.pdf" })).toHaveClass(/text-destructive/);
    });

    test("should warn that the outcome is unverified when the storage upload fails with a 500", async ({ page, backend }) => {
        const token = uniqueToken();
        const agent = await backend.createAgent({ name: `Storage KO ${token}`, ruleValues: {} });
        const inviteId = await backend.seedInvite(INVITE_MONTH, agent, [detailRow(agent)], "bozza");
        const storageUrl = `https://storage.e2e.invalid/${token}`;

        // Both the upload URL and the storage answer are stubbed, so nothing reaches the real storage bucket.
        await page.route(`**/api/storico-inviti/${inviteId}/allegati/upload-url`, (route) =>
            route.fulfill({
                json: {
                    allegato_id: 41,
                    chiave_oggetto: `e2e/${token}`,
                    upload_url: storageUrl,
                    metodo: "PUT",
                    scadenza_secondi: 300,
                    headers_richiesti: { "Content-Type": "application/pdf" },
                    stato: "in_attesa",
                },
            }),
        );
        await page.route(storageUrl, (route) => route.fulfill({ status: 500, body: "boom" }));
        await page.route(`**/api/storico-inviti/${inviteId}/allegati`, (route) => route.fulfill({ json: [] }));
        await page.goto("/");
        await openTab(page, "Inviti");
        await page.getByRole("textbox", { name: "Filtra..." }).fill(token);
        await page.getByRole("button", { name: agent.name, exact: true }).click();

        const dialog = page.getByRole("dialog");

        await dialog.getByRole("tab", { name: "Allegati" }).click();
        await dialog.getByLabel("Aggiungi").setInputFiles({ name: "fattura.pdf", mimeType: "application/pdf", buffer: Buffer.from("e2e") });

        await expect(dialog.getByRole("alert").filter({ hasText: "fattura.pdf" })).toContainText("Non è stato possibile verificare l'esito del caricamento");
    });

    test("should show the file name and its upload date and time when the operator asks to delete an attachment", async ({ page, backend }) => {
        const token = uniqueToken();
        const agent = await backend.createAgent({ name: `Elimina ${token}`, ruleValues: {} });
        const inviteId = await backend.seedInvite(INVITE_MONTH, agent, [detailRow(agent)], "bozza");

        await page.route(`**/api/storico-inviti/${inviteId}/allegati`, (route) =>
            route.fulfill({ json: [attachment(1, inviteId, "da-eliminare.pdf", 10, "2032-01-10T12:34:00Z")] }),
        );
        await page.goto("/");
        await openTab(page, "Inviti");
        await page.getByRole("textbox", { name: "Filtra..." }).fill(token);
        await page.getByRole("button", { name: agent.name, exact: true }).click();
        await page.getByRole("tab", { name: "Allegati" }).click();

        const row = page.getByRole("dialog").getByRole("row").filter({ hasText: "da-eliminare.pdf" });
        const listed = (await row.getByRole("cell").nth(2).innerText()).trim();

        expect(listed, "the list shows date and time").toMatch(/^\d{2}\/\d{2}\/\d{2},? \d{2}:\d{2}$/);

        await page.getByRole("button", { name: "Elimina: da-eliminare.pdf" }).click();

        const confirmation = page.getByRole("alertdialog");

        await expect(confirmation).toContainText("da-eliminare.pdf");
        await expect(confirmation).toContainText(listed);
    });

    test("should offer Riprova and reload the list when an upload fails with a 500", async ({ page, backend }) => {
        const token = uniqueToken();
        const agent = await backend.createAgent({ name: `Storage ${token}`, ruleValues: {} });
        const inviteId = await backend.seedInvite(INVITE_MONTH, agent, [detailRow(agent)], "bozza");
        let lists = 0;

        // Only the attachment endpoints are stubbed, so nothing reaches the real storage bucket.
        await page.route(`**/api/storico-inviti/${inviteId}/allegati/**`, (route) =>
            route.fulfill({ status: 500, json: { error: "HTTP 500: Internal Server Error" } }),
        );
        await page.route(`**/api/storico-inviti/${inviteId}/allegati`, (route) => {
            lists += 1;

            return route.fulfill({ json: lists > 2 ? [attachment(7, inviteId, "ripreso.pdf", 100, "2032-01-20T12:00:00Z")] : [] });
        });
        await page.goto("/");
        await openTab(page, "Inviti");
        await page.getByRole("textbox", { name: "Filtra..." }).fill(token);
        await page.getByRole("button", { name: agent.name, exact: true }).click();

        const dialog = page.getByRole("dialog");

        await dialog.getByRole("tab", { name: "Allegati" }).click();
        await dialog.getByLabel("Aggiungi").setInputFiles({ name: "fattura.pdf", mimeType: "application/pdf", buffer: Buffer.from("e2e") });

        const failure = dialog.getByRole("alert").filter({ hasText: "fattura.pdf" });

        await expect(failure).toContainText("Il server ha riscontrato un errore");
        await expect(failure).not.toContainText("HTTP 500");
        // The request for the upload URL failed, so nothing reached storage and there is no outcome to verify.
        await expect(failure).not.toContainText("verificare l'esito");

        await failure.getByRole("button", { name: "Riprova" }).click();

        await expect(dialog.getByText("ripreso.pdf")).toBeVisible();
        await expect(failure).toHaveCount(0);
    });
});

test.describe("invites in English", () => {
    test.use({ appLanguage: "en" });

    test("should show month names and agent filter texts in English when the app language is English", async ({ page, backend }) => {
        const token = uniqueToken();
        const agent = await backend.createAgent({ name: `English ${token}`, ruleValues: {} });

        await backend.seedInvite(INVITE_MONTH, agent, [detailRow(agent)], "bozza");
        await page.goto("/");
        await openTab(page, "Inviti");
        await page.getByRole("textbox", { name: "Filter..." }).fill(token);

        await expect(agentRow(page, agent)).toContainText("January 2032");

        await page.getByRole("combobox", { name: "All Agents" }).click();

        await expect(page.getByPlaceholder("Search agent...")).toBeVisible();

        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: /^June 2030$/ }).click();

        await expect(page.getByRole("button", { name: "Jan", exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "Clear", exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "Gen", exact: true })).toHaveCount(0);
    });
});
