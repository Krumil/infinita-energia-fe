import { uniqueToken, type Backend } from "./support/backend";
import { expect, test } from "./support/test";
import { openTab } from "./support/ui";

// Signature dates sit in June 2031, the month the suite's fixed clock opens the calendar on.
async function seedPair(backend: Backend, token: string): Promise<void> {
    await backend.seedOrders(token, [
        { customer: `Alfa ${token}`, orderId: 990_001, signedOn: "2031-06-05" },
        { customer: `Beta ${token}`, orderId: 990_002, signedOn: "2031-06-20" },
    ]);
}

test.describe("pending orders", () => {
    test("should confirm with a toast and download the file when the orders are exported", async ({ page, backend }) => {
        const token = uniqueToken();

        await seedPair(backend, token);
        await page.goto("/");
        await openTab(page, "Ordini");
        await page.getByPlaceholder("Cerca cliente, POD o agente…").fill(token);
        await expect(page.getByRole("row", { name: new RegExp(`Alfa ${token}`) })).toBeVisible();

        const download = page.waitForEvent("download");

        await page.getByRole("button", { name: "Esporta" }).click();

        expect((await download).suggestedFilename()).toBe("ordini-inevasi.xlsx");
        await expect(page.getByText("Esportati 2 ordini in ordini-inevasi.xlsx.")).toBeVisible();
    });

    test("should name the order in the dialog when an order is about to be excluded", async ({ page, backend }) => {
        const token = uniqueToken();

        await seedPair(backend, token);
        await page.goto("/");
        await openTab(page, "Ordini");
        await page.getByPlaceholder("Cerca cliente, POD o agente…").fill(token);
        await page.getByRole("row", { name: new RegExp(`Beta ${token}`) }).getByRole("button", { name: "Escludi" }).click();

        const dialog = page.getByRole("dialog", { name: "Escludi ordine" });

        await expect(dialog).toContainText(`#990002 Test Beta ${token}`);
        await expect(dialog).toContainText(`${token}P1`);
    });

});
