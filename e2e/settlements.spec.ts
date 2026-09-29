import { uniqueToken, type SettlementRow } from "./support/backend";
import { recordApiWrites } from "./support/network";
import { expect, test } from "./support/test";
import { attachWorkbook, openSettlements } from "./support/ui";

// Covers docs/frontend-calcolo-refactor/test-guides/02-liquidation-import-and-deletion.md.
const MONTH = "2031-07";

// Sellers match no agent, so every stored row shows up as unmatched in the preview and the row count can be read back.
function sellerRows(token: string, count: number, firstOrderId: number): SettlementRow[] {
    return Array.from({ length: count }, (_, index) => ({
        seller: `Venditore Ignoto${token}`,
        rule: "Gettone Residenziale Standard",
        amount: 100 + index,
        customer: `Cliente ${index + 1} ${token}`,
        orderId: firstOrderId + index,
    }));
}

test.describe("liquidation import and deletion", () => {
    test("should import every row with an order ID, duplicates included, when the month is empty", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);

        const token = uniqueToken();
        const rows = sellerRows(token, 3, 990_100);
        const importBodies: string[] = [];

        page.on("request", (request) => {
            if (request.method() === "POST" && request.url().endsWith("/api/importa-liquidazioni")) importBodies.push(request.postData() ?? "");
        });

        await page.goto("/");

        const dialog = await openSettlements(page, MONTH);

        await attachWorkbook(dialog, MONTH, `duplicati-${token}.xlsx`, [...rows, rows[0]]);

        const pendingOrdersRefresh = page.waitForRequest(
            (request) => request.method() === "GET" && new URL(request.url()).pathname === "/api/ordini-non-evasi",
        );

        await dialog.getByRole("button", { name: "Importa Liquidazioni" }).click();

        const result = dialog.getByRole("status");

        await expect(result).toContainText("4 record elaborati · Importazione completata. Inserite 4 righe.");
        await expect(result).not.toContainText("Righe senza ID Ordine");
        await pendingOrdersRefresh;
        expect(importBodies).toHaveLength(1);

        const sentRows: Array<{ competenza_liquidazione: string }> = JSON.parse(importBodies[0]);

        expect(sentRows.map((row) => row.competenza_liquidazione)).toEqual(["07/2031", "07/2031", "07/2031", "07/2031"]);
        expect(await backend.storedUnmatchedRows(MONTH)).toBe(4);
    });

    test("should keep the file and send no deletion when the month is already imported and the replacement is cancelled", async ({
        page,
        backend,
    }) => {
        await backend.claimMonth(MONTH);

        const token = uniqueToken();

        await backend.importRows(MONTH, sellerRows(token, 2, 990_200));
        await page.goto("/");

        const dialog = await openSettlements(page, MONTH);
        const fileName = `conflitto-${token}.xlsx`;

        await attachWorkbook(dialog, MONTH, fileName, sellerRows(token, 3, 990_210));

        const writes = recordApiWrites(page);

        await dialog.getByRole("button", { name: "Importa Liquidazioni" }).click();

        const conflict = dialog.getByRole("alert");

        await expect(conflict).toContainText(
            "Questo mese ha già delle liquidazioni, quindi il file non è stato importato. Per sostituirle con quelle del file, usa il pulsante qui sotto.",
        );

        await expect(dialog.getByRole("button", { name: "Importa Liquidazioni" })).toBeDisabled();

        await conflict.getByRole("button", { name: "Elimina competenza e reimporta" }).click();

        await expect(dialog.getByRole("heading", { name: "Eliminare le liquidazioni di luglio 2031?" })).toBeVisible();
        await expect(dialog).toContainText("Stai per eliminare tutte le liquidazioni della competenza 07/2031.");
        await expect(dialog).toContainText("Gli inviti già generati non verranno eliminati");
        await expect(dialog).toContainText("Dopo il reimport esegui nuovamente anteprima e conferma.");
        await expect(dialog).toContainText(`Subito dopo verrà importato ${fileName}.`);

        await dialog.getByRole("button", { name: "Annulla" }).click();

        await expect(conflict.getByRole("button", { name: "Elimina competenza e reimporta" })).toBeVisible();
        await expect(dialog.getByText(fileName)).toBeVisible();
        expect(writes).toEqual(["start POST /api/importa-liquidazioni", "end POST /api/importa-liquidazioni"]);
        expect(await backend.storedUnmatchedRows(MONTH)).toBe(2);
    });

    test("should delete the month and then import the kept file when the replacement is confirmed", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);

        const token = uniqueToken();

        await backend.importRows(MONTH, sellerRows(token, 2, 990_300));
        await page.goto("/");

        const dialog = await openSettlements(page, MONTH);

        await attachWorkbook(dialog, MONTH, `sostituzione-${token}.xlsx`, sellerRows(token, 3, 990_310));
        await dialog.getByRole("button", { name: "Importa Liquidazioni" }).click();
        await dialog.getByRole("alert").getByRole("button", { name: "Elimina competenza e reimporta" }).click();

        const writes = recordApiWrites(page);

        await dialog.getByRole("button", { name: "Elimina competenza e reimporta" }).click();

        const result = dialog.getByRole("status");

        await expect(result).toContainText("Liquidazioni eliminate: 2.");
        await expect(result).toContainText("3 record elaborati · Importazione completata. Inserite 3 righe.");

        await expect
            .poll(() => writes)
            .toEqual([
                "start DELETE /api/liquidazioni/2031-07-01",
                "end DELETE /api/liquidazioni/2031-07-01",
                "start POST /api/importa-liquidazioni",
                "end POST /api/importa-liquidazioni",
            ]);

        expect(await backend.storedUnmatchedRows(MONTH)).toBe(3);
    });

    test("should keep the existing rows and the file when deleting the month fails during a replacement", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);

        const token = uniqueToken();

        await backend.importRows(MONTH, sellerRows(token, 2, 990_400));
        await page.goto("/");

        const dialog = await openSettlements(page, MONTH);
        const fileName = `eliminazione-fallita-${token}.xlsx`;

        await attachWorkbook(dialog, MONTH, fileName, sellerRows(token, 3, 990_410));
        await dialog.getByRole("button", { name: "Importa Liquidazioni" }).click();
        await dialog.getByRole("alert").getByRole("button", { name: "Elimina competenza e reimporta" }).click();

        await page.route("**/api/liquidazioni/*", (route) =>
            route.fulfill({ status: 500, json: { success: false, message: "Errore simulato: eliminazione rifiutata" } }),
        );

        const writes = recordApiWrites(page);

        await dialog.getByRole("button", { name: "Elimina competenza e reimporta" }).click();

        const alert = dialog.getByRole("alert");

        await expect(alert).toContainText("Errore simulato: eliminazione rifiutata");
        await expect(alert.getByRole("button", { name: "Elimina competenza e reimporta" })).toBeVisible();
        await expect(dialog.getByText(fileName)).toBeVisible();
        expect(writes).toEqual(["start DELETE /api/liquidazioni/2031-07-01", "end DELETE /api/liquidazioni/2031-07-01"]);
        expect(await backend.storedUnmatchedRows(MONTH)).toBe(2);
    });

    test("should say the month was cleared and retry only the import when the import fails after the deletion", async ({
        page,
        backend,
    }) => {
        await backend.claimMonth(MONTH);

        const token = uniqueToken();

        await backend.importRows(MONTH, sellerRows(token, 2, 990_500));
        await page.goto("/");

        const dialog = await openSettlements(page, MONTH);

        await attachWorkbook(dialog, MONTH, `importazione-fallita-${token}.xlsx`, sellerRows(token, 3, 990_510));
        await dialog.getByRole("button", { name: "Importa Liquidazioni" }).click();
        await dialog.getByRole("alert").getByRole("button", { name: "Elimina competenza e reimporta" }).click();

        await page.route(
            "**/api/importa-liquidazioni",
            (route) => route.fulfill({ status: 500, json: { success: false, message: "Errore simulato: importazione non riuscita" } }),
            { times: 1 },
        );

        await dialog.getByRole("button", { name: "Elimina competenza e reimporta" }).click();

        const alert = dialog.getByRole("alert");

        await expect(alert).toContainText("Errore simulato: importazione non riuscita");
        await expect(alert).toContainText("La competenza è stata svuotata. Il file è conservato: riprova l'importazione senza eliminare nuovamente.");
        await expect(dialog).toContainText("Liquidazioni eliminate: 2.");
        expect(await backend.storedUnmatchedRows(MONTH)).toBe(0);

        const writes = recordApiWrites(page);

        await dialog.getByRole("button", { name: "Riprova importazione" }).click();

        await expect(dialog.getByRole("status")).toContainText("3 record elaborati · Importazione completata. Inserite 3 righe.");
        await expect.poll(() => writes).toEqual(["start POST /api/importa-liquidazioni", "end POST /api/importa-liquidazioni"]);
        expect(await backend.storedUnmatchedRows(MONTH)).toBe(3);
    });

    test("should report zero deleted rows as a success and lock the controls while deleting when the month is empty", async ({
        page,
        backend,
    }) => {
        await backend.claimMonth(MONTH);
        await page.goto("/");

        const dialog = await openSettlements(page, MONTH);
        const deletion = Promise.withResolvers<void>();

        await page.route("**/api/liquidazioni/*", async (route) => {
            await deletion.promise;
            await route.continue();
        });

        const writes = recordApiWrites(page);

        await dialog.getByRole("button", { name: "Elimina liquidazioni di luglio 2031" }).click();
        await expect(dialog.getByRole("heading", { name: "Eliminare le liquidazioni di luglio 2031?" })).toBeVisible();
        await dialog.getByRole("button", { name: "Elimina 07/2031" }).click();

        await expect(dialog.getByText("Elaborazione...")).toBeVisible();
        await expect(dialog.getByRole("button", { name: "Elimina liquidazioni di luglio 2031" })).toBeDisabled();
        await expect(dialog.getByRole("button", { name: "luglio 2031", exact: true })).toBeDisabled();

        deletion.resolve();

        await expect(dialog.getByRole("status")).toHaveText("Liquidazioni eliminate: 0.");
        await expect(dialog.getByRole("alert")).toHaveCount(0);
        expect(writes).toEqual(["start DELETE /api/liquidazioni/2031-07-01", "end DELETE /api/liquidazioni/2031-07-01"]);
    });

    test("should leave every invite untouched when a month's liquidazioni are deleted", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);
        await backend.importRows(MONTH, sellerRows(uniqueToken(), 2, 990_600));

        const invitesBefore = await backend.invitesSnapshot();

        await page.goto("/");

        const dialog = await openSettlements(page, MONTH);
        const writes = recordApiWrites(page);

        await dialog.getByRole("button", { name: "Elimina liquidazioni di luglio 2031" }).click();
        await expect(dialog).toContainText("Gli inviti già generati non verranno eliminati e potrebbero non corrispondere più alle liquidazioni.");
        await dialog.getByRole("button", { name: "Elimina 07/2031" }).click();

        await expect(dialog.getByRole("status")).toHaveText("Liquidazioni eliminate: 2.");
        expect(writes).toEqual(["start DELETE /api/liquidazioni/2031-07-01", "end DELETE /api/liquidazioni/2031-07-01"]);
        expect(await backend.storedUnmatchedRows(MONTH)).toBe(0);
        expect(await backend.invitesSnapshot()).toBe(invitesBefore);
    });

    test("should send one import request when the import button is double-clicked", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);
        await page.goto("/");

        const token = uniqueToken();
        const dialog = await openSettlements(page, MONTH);
        const upload = Promise.withResolvers<void>();

        await attachWorkbook(dialog, MONTH, `doppio-clic-${token}.xlsx`, sellerRows(token, 2, 990_700));

        await page.route("**/api/importa-liquidazioni", async (route) => {
            await upload.promise;
            await route.continue();
        });

        const writes = recordApiWrites(page);
        const importButton = dialog.getByRole("button", { name: "Importa Liquidazioni" });

        await importButton.dblclick();

        await expect(dialog.getByText("Elaborazione...")).toBeVisible();
        await expect(importButton).toBeDisabled();

        upload.resolve();

        await expect(dialog.getByRole("status")).toContainText("2 record elaborati · Importazione completata. Inserite 2 righe.");
        expect(writes).toEqual(["start POST /api/importa-liquidazioni", "end POST /api/importa-liquidazioni"]);
        expect(await backend.storedUnmatchedRows(MONTH)).toBe(2);
    });

    test("should import only rows with an order ID and report the rest when some rows have none", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);
        await page.goto("/");

        const token = uniqueToken();
        const withoutIds = sellerRows(token, 2, 0).map((row) => ({ ...row, customer: `Senza ID ${row.customer}`, orderId: null }));
        const dialog = await openSettlements(page, MONTH);

        await attachWorkbook(dialog, MONTH, `id-misti-${token}.xlsx`, [...sellerRows(token, 3, 990_800), ...withoutIds]);
        await dialog.getByRole("button", { name: "Importa Liquidazioni" }).click();

        const result = dialog.getByRole("status");

        await expect(result).toContainText("3 record elaborati · Importazione completata. Inserite 3 righe.");
        await expect(result).toContainText("Righe senza ID Ordine non importate: 2.");
        expect(await backend.storedUnmatchedRows(MONTH)).toBe(3);
    });

    test("should refuse the file before sending anything when no row has an order ID", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);
        await page.goto("/");

        const token = uniqueToken();
        const rows = sellerRows(token, 2, 0).map((row) => ({ ...row, orderId: null }));
        const dialog = await openSettlements(page, MONTH);

        await attachWorkbook(dialog, MONTH, `senza-id-${token}.xlsx`, rows);

        const writes = recordApiWrites(page);

        await dialog.getByRole("button", { name: "Importa Liquidazioni" }).click();

        await expect(dialog.getByRole("alert")).toHaveText("Nessuna riga del file ha un ID Ordine, quindi non c'è niente da importare.");
        expect(writes).toEqual([]);
        expect(await backend.storedUnmatchedRows(MONTH)).toBe(0);
    });
});
