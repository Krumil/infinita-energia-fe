import type { Download, Locator, Page } from "@playwright/test";

import { uniqueToken, type InviteDetail, type TestAgent } from "./support/backend";
import { agentRow } from "./support/calculation";
import { expect, test } from "./support/test";
import { download, openTab } from "./support/ui";
import { expectWorkbook, readWorkbook } from "./support/zip";

// Invites need no liquidazioni, so these months stay clear of the ones the calculation specs claim.
const FIRST_YEAR = 2032;

function inviteMonth(offset: number): string {
    return `${FIRST_YEAR + Math.floor(offset / 12)}-${String((offset % 12) + 1).padStart(2, "0")}`;
}

function detailRow(agent: TestAgent, index: number): InviteDetail {
    return {
        venditore: agent.name,
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
            rows.map((row) => [row.cliente, row.cf_piva, row.pod_pdr, row.comp_al, row.regola, row.importo_provvigione, row.venditore]),
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
