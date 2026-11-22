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




