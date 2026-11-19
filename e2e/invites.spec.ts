import type { Download, Locator, Page } from "@playwright/test";

import { sellerKey, uniqueToken, type InviteDetail, type TestAgent } from "./support/backend";
import { agentRow } from "./support/calculation";
import { expect, test } from "./support/test";
import { download, openTab } from "./support/ui";
import { expectWorkbook, readWorkbook } from "./support/zip";

// Invites need no liquidazioni, so these months stay clear of the ones the calculation specs claim.
const FIRST_YEAR = 2032;

function inviteMonth(offset: number): string {
    return `${FIRST_YEAR + Math.floor(offset / 12)}-${String((offset % 12) + 1).padStart(2, "0")}`;
}

// Saved rows keep the seller as the import's agent key, while the screens and files show the agent's typed name.
function detailRow(agent: TestAgent, index: number): InviteDetail {
    return {
        venditore: sellerKey(agent.name),
        comp_al: "2032-01-31",
        regola: "Gettone Residenziale Standard",
        importo_provvigione: 1,
        pod_pdr: `IT001E${String(index).padStart(8, "0")}`,
        cliente: `Cliente ${String(index).padStart(3, "0")} ${agent.id}`,
        cf_piva: "E2ETST80A01H501A",
    };
}

async function openInvites(page: Page, token: string): Promise<void> {
    await page.goto("/");
    await openTab(page, "Inviti");
    await page.getByRole("textbox", { name: "Filtra..." }).fill(token);
}

function excelButton(page: Page, agent: TestAgent): Locator {
    return agentRow(page, agent).getByRole("button", { name: /^Scarica Excel: / });
}

test.describe("single invite workbook", () => {
    test("should download the invite's rows and total as one workbook when the operator clicks Scarica Excel", async ({ page, backend }) => {
        const token = uniqueToken();
        const agent = await backend.createAgent({ name: `Excel ${token}`, ruleValues: {} });
        const rows = [detailRow(agent, 0), { ...detailRow(agent, 1), importo_provvigione: 2.5 }];

        await backend.seedInvite(inviteMonth(0), agent, rows, "bozza");
        await openInvites(page, token);

        const file = await download(page, excelButton(page, agent));

        // The backend stores agent names as sorted uppercase words, and the file name joins them with underscores.
        expect(file.suggestedFilename()).toBe(`${inviteMonth(0)}-${agent.name.split(" ").join("_")}-${agent.id}.xlsx`);
        expectWorkbook(
            await readWorkbook(file),
            rows.map((row) => [row.cliente, row.cf_piva, row.pod_pdr, row.comp_al, row.regola, row.importo_provvigione, agent.name]),
            ["TOTALE", "", "", "", "", 3.5, ""],
        );
        await expect(page.getByRole("dialog")).toHaveCount(0);
    });

    test("should show the server's error and download nothing when the invite detail fails", async ({ page, backend }) => {
        const token = uniqueToken();
        const agent = await backend.createAgent({ name: `Errore ${token}`, ruleValues: {} });
        const inviteId = await backend.seedInvite(inviteMonth(0), agent, [detailRow(agent, 0)], "bozza");
        const downloads: Download[] = [];

        page.on("download", (file) => downloads.push(file));

        // The backend can't fail a detail read on demand, so this one response is replaced with a server error.
        await page.route(`**/api/storico-inviti/${inviteId}/dettaglio`, (route) =>
            route.fulfill({ status: 500, json: { error: "Errore di lettura simulato" } }),
        );
        await openInvites(page, token);
        await excelButton(page, agent).click();

        await expect(page.getByText("Errore di lettura simulato", { exact: true })).toBeVisible();
        await expect(excelButton(page, agent)).toBeEnabled();
        expect(downloads).toEqual([]);
    });
});

test.describe("invite list", () => {
    test("should show the server error and list the invites after Riprova when the invite list fails to load", async ({ page, backend }) => {
        const token = uniqueToken();
        const agent = await backend.createAgent({ name: `Lista ${token}`, ruleValues: {} });

        await backend.seedInvite(inviteMonth(0), agent, [detailRow(agent, 0)], "bozza");

        const isList = (url: URL): boolean => url.pathname === "/api/storico-inviti";

        // The backend can't fail the list on demand, so its answers are a server error until the retry.
        await page.route(isList, (route) => route.fulfill({ status: 500, json: { error: "Errore di lettura simulato" } }));
        await openInvites(page, token);

        const failure = page.getByRole("alert").filter({ has: page.getByRole("button", { name: "Riprova" }) });

        await expect(failure.getByText("Il server ha riscontrato un errore. Riprova tra poco.", { exact: true })).toBeVisible();
        await expect(agentRow(page, agent)).toHaveCount(0);

        await page.unroute(isList);
        await failure.getByRole("button", { name: "Riprova" }).click();

        await expect(agentRow(page, agent)).toBeVisible();
        await expect(failure).toHaveCount(0);
    });
});

test.describe("invite detail", () => {
    test("should show the agent's typed name when a saved row's seller is the agent's key", async ({ page, backend }) => {
        const token = uniqueToken();
        const agent = await backend.createAgent({ name: `Venditore ${token}`, ruleValues: {} });
        const outsider = `Esterno ${token}`;

        await backend.seedInvite(inviteMonth(0), agent, [detailRow(agent, 0), { ...detailRow(agent, 1), venditore: outsider }], "bozza");
        await openInvites(page, token);
        await page.getByRole("button", { name: agent.name, exact: true }).click();

        const dialog = page.getByRole("dialog", { name: agent.name });

        await dialog.getByRole("tab", { name: "Dettaglio" }).click();

        const detail = dialog.getByRole("region", { name: "Dettaglio invito" });

        await expect(detail.getByRole("row", { name: new RegExp(`Cliente 000 ${agent.id}`) }).getByRole("cell").first()).toHaveText(agent.name);
        // A seller who isn't one of our agents has no typed name, so the stored text stays.
        await expect(detail.getByRole("row", { name: new RegExp(`Cliente 001 ${agent.id}`) }).getByRole("cell").first()).toHaveText(outsider);
    });
});

test.describe("invites with many rows", () => {
    test("should list the invites a hundred at a time when the filter matches 105 invites", async ({ page, backend }) => {
        const token = uniqueToken();
        const agent = await backend.createAgent({ name: `Inviti ${token}`, ruleValues: {} });

        // Each invite has its own month, so the saves don't touch the same row and can run at once.
        await Promise.all(
            Array.from({ length: 105 }, (_, offset) => backend.seedInvite(inviteMonth(offset), agent, [detailRow(agent, offset)], "bozza")),
        );

        await openInvites(page, token);

        const rows = agentRow(page, agent);

        await expect(rows).toHaveCount(100);
        await expect(page.getByText("100 righe mostrate su 105", { exact: true })).toBeVisible();

        await page.getByText("100 righe mostrate su 105", { exact: true }).scrollIntoViewIfNeeded();

        await expect(rows).toHaveCount(105);
        await expect(page.getByText(/righe mostrate su/)).toHaveCount(0);
    });

    test("should show an invite's detail a hundred rows at a time when the invite has 150 rows", async ({ page, backend }) => {
        const token = uniqueToken();
        const agent = await backend.createAgent({ name: `Dettaglio ${token}`, ruleValues: {} });

        await backend.seedInvite(
            inviteMonth(0),
            agent,
            Array.from({ length: 150 }, (_, index) => detailRow(agent, index)),
            "bozza",
        );
        await openInvites(page, token);
        await expect(agentRow(page, agent).getByRole("cell").nth(2)).toHaveText("150,00 €");
        await page.getByRole("button", { name: agent.name, exact: true }).click();

        const dialog = page.getByRole("dialog", { name: agent.name });

        await dialog.getByRole("tab", { name: "Dettaglio" }).click();

        const rows = dialog
            .getByRole("region", { name: "Dettaglio invito" })
            .getByRole("row")
            .filter({ hasNot: page.getByRole("columnheader") });

        await expect(rows).toHaveCount(100);
        await expect(dialog.getByText("100 righe mostrate su 150", { exact: true })).toBeVisible();

        await dialog.getByText("100 righe mostrate su 150", { exact: true }).scrollIntoViewIfNeeded();

        await expect(rows).toHaveCount(150);
        await expect(dialog.getByText(/righe mostrate su/)).toHaveCount(0);
    });
});

test.describe("invite month filter", () => {
    test("should pick a distant year in one step when the operator chooses it from the year list", async ({ page, backend }) => {
        const token = uniqueToken();
        const agent = await backend.createAgent({ name: `Anno ${token}`, ruleValues: {} });

        await backend.seedInvite(inviteMonth(0), agent, [detailRow(agent, 0)], "bozza");
        await openInvites(page, token);
        await page.getByRole("button", { name: /^giugno 2030$/ }).click();
        await page.getByRole("combobox", { name: "Anno" }).selectOption("2045");
        await page.getByRole("button", { name: "Mar", exact: true }).click();

        await expect(page.getByRole("button", { name: "marzo 2045" })).toBeVisible();

        // The arrows still step one year at a time from the picked year.
        await page.getByRole("button", { name: "marzo 2045" }).click();
        await page.getByRole("button", { name: "Anno precedente" }).click();

        await expect(page.getByRole("combobox", { name: "Anno" })).toHaveValue("2044");
    });
});

test.describe("invite agent filter", () => {
    test("should list the last chosen agent's invites when an earlier agent's answer arrives later", async ({ page, backend }) => {
        const token = uniqueToken();
        const first = await backend.createAgent({ name: `Primo ${token}`, ruleValues: {} });
        const second = await backend.createAgent({ name: `Secondo ${token}`, ruleValues: {} });

        await backend.seedInvite(inviteMonth(0), first, [detailRow(first, 0)], "bozza");
        await backend.seedInvite(inviteMonth(0), second, [detailRow(second, 0)], "bozza");

        const forFirst = (url: URL): boolean => url.pathname === "/api/storico-inviti" && url.searchParams.get("agente_id") === String(first.id);
        let release: () => void = () => undefined;

        const released = new Promise<void>((resolve) => {
            release = resolve;
        });

        await page.route(forFirst, async (route) => {
            await released;
            await route.continue();
        });

        const choose = async (current: string, agent: TestAgent): Promise<void> => {
            await page.getByRole("combobox", { name: current }).click();
            await page.getByPlaceholder("Cerca agente...").fill(agent.name);
            await page.getByRole("option", { name: agent.name, exact: true }).click();
        };

        await page.goto("/");
        await openTab(page, "Inviti");
        await choose("Tutti gli Agenti", first);
        await choose(first.name, second);
        await expect(agentRow(page, second)).toBeVisible();

        const late = page.waitForResponse((response) => forFirst(new URL(response.url())));

        release();
        await (await late).finished();
        // Two frames give React time to render the late answer, had it been accepted.
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

        await expect(agentRow(page, second)).toBeVisible();
        await expect(agentRow(page, first)).toHaveCount(0);
    });
});

test.describe("invite row upload", () => {
    test("should show a translated message instead of the storage status when the storage refuses the file with a 403", async ({ page, backend }) => {
        const token = uniqueToken();
        const agent = await backend.createAgent({ name: `Rifiuto ${token}`, ruleValues: {} });
        const inviteId = await backend.seedInvite(inviteMonth(0), agent, [detailRow(agent, 0)], "bozza");
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
        await page.route(storageUrl, (route) => route.fulfill({ status: 403, body: "denied" }));
        await openInvites(page, token);

        const chooser = page.waitForEvent("filechooser");

        await agentRow(page, agent).getByRole("button", { name: /^Aggiungi allegato: / }).click();
        await (await chooser).setFiles({ name: "fattura.pdf", mimeType: "application/pdf", buffer: Buffer.from("e2e") });

        await expect(page.getByText("fattura.pdf: Impossibile caricare il file.", { exact: true })).toBeVisible();
        await expect(page.getByText(/HTTP 403/)).toHaveCount(0);
    });
});
