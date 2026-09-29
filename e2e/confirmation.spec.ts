import type { Locator, Page } from "@playwright/test";

import { uniqueToken, type Backend, type InviteDetail, type RuleName, type SettlementRow, type TestAgent } from "./support/backend";
import {
    agentRow,
    agentTotal,
    amountInputs,
    confirmButton,
    expand,
    expectAmounts,
    includeBox,
    monthGroup,
    overallTotal,
    previewButton,
} from "./support/calculation";
import { recordApiWrites } from "./support/network";
import { expect, test } from "./support/test";
import { openTab, pickMonth } from "./support/ui";

// Covers docs/frontend-calcolo-refactor/test-guides/05-confirmation.md.
const MONTH = "2031-12";

const MONTH_LABEL = "Dicembre 2031";

const COMP_AL = "2031-12-31";

const TAX_ID = "E2ETST80A01H501A";

const CONFIRM_PATH = "/api/calcolo/conferma";

const CONFIRM_WRITE = `start POST ${CONFIRM_PATH}`;

const SKIPPED_REASON = "invito non più in bozza";

const REPLACE_NOTE =
    "Per ogni agente incluso, l'invito in bozza di questa competenza viene sostituito con queste righe. Gli inviti degli agenti esclusi non cambiano. Gli inviti non più in bozza non vengono modificati.";

const SUBMITTING_BLOCK = "Salvataggio in corso: la bozza è bloccata finché il server non risponde.";

const CHANGED_AFTER_SAVE = "Hai modificato la bozza dopo il salvataggio: le modifiche nuove non sono salvate finché non confermi di nuovo.";

const REJECTED_DESCRIPTION = "Il server non ha salvato nulla. Le modifiche restano nella bozza: correggile e conferma di nuovo.";

const UNKNOWN_DESCRIPTION = "Non sappiamo se il salvataggio è avvenuto. Apri Inviti e controlla prima di confermare di nuovo.";

const STANDARD: RuleName = "Gettone Residenziale Standard";

const RENEWAL: RuleName = "Rinnovo Residenziale";

const PODS = {
    twin: "IT001E99000011",
    hidden: "IT001E99000012",
    dueA: "IT001E99000013",
    dueB: "IT001E99000014",
    excluded: "IT001E99000015",
    unmatched: "IT001E99000016",
    previous: "IT001E99000017",
};

interface Fixture {
    uno: TestAgent;
    due: TestAgent;
    escluso: TestAgent;
    twinCustomer: string;
    hiddenCustomer: string;
    dueACustomer: string;
    dueBCustomer: string;
    excludedCustomer: string;
    previousCustomer: string;
    unmatchedSeller: string;
}

interface SavedResult {
    agente_id: number;
    invito_id: number;
    totale_invito: number;
}

interface SentConfirmation {
    mese_competenza: string;
    agenti: Array<{ agente_id: number; dettaglio: InviteDetail[] }>;
}

// Expected commissions: Uno 150 + 150 + 20 = 320, Due 40 + 40 = 80, Escluso 7. Overall 407. One row matches no agent.
async function createFixture(backend: Backend): Promise<Fixture> {
    const token = uniqueToken();

    const uno = await backend.createAgent({ name: `Uno ${token}`, ruleValues: { [STANDARD]: 150, [RENEWAL]: 20 } });
    const due = await backend.createAgent({ name: `Due ${token}`, ruleValues: { [STANDARD]: 40 } });
    const escluso = await backend.createAgent({ name: `Escluso ${token}`, ruleValues: { [STANDARD]: 7 } });

    return {
        uno,
        due,
        escluso,
        twinCustomer: `Cliente Doppio ${token}`,
        hiddenCustomer: `Cliente Nascosto ${token}`,
        dueACustomer: `Cliente Due A ${token}`,
        dueBCustomer: `Cliente Due B ${token}`,
        excludedCustomer: `Cliente Escluso ${token}`,
        previousCustomer: `Cliente Precedente ${token}`,
        unmatchedSeller: `Nessuno ${token}`,
    };
}

function fixtureRows(fixture: Fixture): SettlementRow[] {
    const twinRow: SettlementRow = { seller: fixture.uno.name, rule: STANDARD, amount: 100, customer: fixture.twinCustomer, orderId: 993_001, pod: PODS.twin };

    return [
        twinRow,
        { ...twinRow },
        { seller: fixture.uno.name, rule: RENEWAL, amount: 40, customer: fixture.hiddenCustomer, orderId: 993_002, pod: PODS.hidden },
        { seller: fixture.due.name, rule: STANDARD, amount: 100, customer: fixture.dueACustomer, orderId: 993_003, pod: PODS.dueA },
        { seller: fixture.due.name, rule: STANDARD, amount: 100, customer: fixture.dueBCustomer, orderId: 993_004, pod: PODS.dueB },
        { seller: fixture.escluso.name, rule: STANDARD, amount: 100, customer: fixture.excludedCustomer, orderId: 993_005, pod: PODS.excluded },
        { seller: fixture.unmatchedSeller, rule: STANDARD, amount: 100, customer: `Cliente Orfano ${fixture.uno.id}`, orderId: 993_006, pod: PODS.unmatched },
    ];
}

function sentRow(agent: TestAgent, regola: RuleName, importo_provvigione: number, cliente: string, pod_pdr: string): InviteDetail {
    return { venditore: agent.name, comp_al: COMP_AL, regola, importo_provvigione, pod_pdr, cliente, cf_piva: TAX_ID };
}

// An invite that was saved before the test, with one row the preview doesn't contain.
async function seedPreviousInvite(backend: Backend, fixture: Fixture, agent: TestAgent, stato: "bozza" | "inviato"): Promise<number> {
    return backend.seedInvite(MONTH, agent, [sentRow(agent, STANDARD, 11, fixture.previousCustomer, PODS.previous)], stato);
}

async function createAndPreview(page: Page, backend: Backend, seed?: (fixture: Fixture) => Promise<void>): Promise<Fixture> {
    await backend.claimMonth(MONTH);

    const fixture = await createFixture(backend);

    await backend.importRows(MONTH, fixtureRows(fixture));
    await seed?.(fixture);
    await page.goto("/");
    await openTab(page, "Provvigioni");
    await pickMonth(page, monthGroup(page), MONTH);
    await previewButton(page).click();
    await expect(overallTotal(page)).toHaveText("407,00 €");

    return fixture;
}

function reviewDialog(page: Page): Locator {
    return page.getByRole("alertdialog", { name: `Conferma le provvigioni di ${MONTH_LABEL}` });
}

function saveButton(page: Page): Locator {
    return reviewDialog(page).getByRole("button", { name: "Salva provvigioni" });
}

function outcome(page: Page): Locator {
    return page.getByRole("region", { name: "Esito del salvataggio" });
}

function outcomeRow(page: Page, agent: TestAgent): Locator {
    return outcome(page).getByRole("row").filter({ has: page.getByRole("cell", { name: agent.name, exact: true }) });
}

async function expectCells(row: Locator, cells: string[]): Promise<void> {
    await expect(row.getByRole("cell")).toHaveText(cells);
}

async function confirmFromReview(page: Page): Promise<void> {
    await confirmButton(page).click();
    await saveButton(page).click();
    await expect(reviewDialog(page)).toBeHidden();
}

function confirmationWrites(writes: string[]): string[] {
    return writes.filter((write) => write.startsWith("start "));
}

// Holds every confirmation at the browser until released, then lets it reach the real backend.
async function holdConfirmations(page: Page): Promise<() => void> {
    let release: () => void = () => undefined;

    const released = new Promise<void>((resolve) => {
        release = resolve;
    });

    await page.route(`**${CONFIRM_PATH}`, async (route) => {
        await released;
        await route.continue();
    });

    return () => release();
}

function byCustomerThenAmount(a: InviteDetail, b: InviteDetail): number {
    return a.cliente.localeCompare(b.cliente) || b.importo_provvigione - a.importo_provvigione;
}

// The row order follows the server's preview order, which the tests don't pin down, so both sides are sorted.
function sortedConfirmation(body: SentConfirmation): SentConfirmation {
    return {
        mese_competenza: body.mese_competenza,
        agenti: [...body.agenti]
            .sort((a, b) => a.agente_id - b.agente_id)
            .map((agent) => ({ agente_id: agent.agente_id, dettaglio: [...agent.dettaglio].sort(byCustomerThenAmount) })),
    };
}

// The cells an operator reads in the invite's Dettaglio tab, in the order they come from an InviteDetail.
function detailCells(row: InviteDetail, amount: string): string[] {
    const [year, month, day] = row.comp_al.split("-");

    return [row.venditore, `${day}/${month}/${year}`, row.regola, row.pod_pdr, row.cliente, row.cf_piva, amount];
}

async function expectInviteDetails(page: Page, agent: TestAgent, expected: string[][]): Promise<void> {
    await page.getByRole("button", { name: agent.name, exact: true }).click();

    const dialog = page.getByRole("dialog", { name: agent.name });

    await dialog.getByRole("tab", { name: "Dettaglio" }).click();

    const rows = dialog
        .getByRole("region", { name: "Dettaglio invito" })
        .getByRole("row")
        .filter({ hasNot: page.getByRole("columnheader") });

    await expect(rows).toHaveCount(expected.length);

    const shown: string[][] = [];

    for (const row of await rows.all()) shown.push(await row.getByRole("cell").allInnerTexts());

    // Currency cells use a non-breaking space before the euro sign, which toHaveText would normalize the same way.
    const key = (cells: string[]): string => cells.map((cell) => cell.replace(/\s+/g, " ").trim()).join("|");

    expect(shown.map(key).sort()).toEqual(expected.map(key).sort());

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
}

test.describe("commission confirmation", () => {
    test("should send only the included agents' rows with permitted fields, hidden rows and a month start when the review is confirmed", async ({
        page,
        backend,
    }) => {
        const fixture = await createAndPreview(page, backend);
        const writes = recordApiWrites(page);

        await expand(page, fixture.due);
        await page.getByRole("button", { name: `Rimuovi la riga di ${fixture.dueBCustomer}` }).click();
        await includeBox(page, fixture.escluso).click();
        await expand(page, fixture.uno);
        await page.getByRole("textbox", { name: "Filtra..." }).fill("Doppio");
        await amountInputs(page, fixture.twinCustomer).first().fill("175,50");

        await expect(amountInputs(page, fixture.hiddenCustomer)).toHaveCount(0);
        await expect(overallTotal(page)).toHaveText("385,50 €");

        await confirmButton(page).click();

        const dialog = reviewDialog(page);

        await expect(dialog.getByRole("term")).toHaveText(["Agenti inclusi", "Righe incluse", "Totale", "Agenti esclusi", "Righe non associate"]);
        await expect(dialog.getByRole("definition")).toHaveText(["2", "4", "385,50 €", "1", "1"]);
        await expect(dialog).toContainText(REPLACE_NOTE);

        await dialog.getByRole("button", { name: "Annulla" }).click();

        await expect(dialog).toBeHidden();
        await expect(outcome(page)).toHaveCount(0);
        expect(writes).toEqual([]);

        await confirmButton(page).click();

        const sent = page.waitForRequest((request) => request.url().endsWith(CONFIRM_PATH) && request.method() === "POST");

        await saveButton(page).click();

        const body: SentConfirmation = (await sent).postDataJSON();

        expect(sortedConfirmation(body)).toEqual({
            mese_competenza: "2031-12-01",
            agenti: [
                {
                    agente_id: fixture.uno.id,
                    dettaglio: [
                        sentRow(fixture.uno, STANDARD, 175.5, fixture.twinCustomer, PODS.twin),
                        sentRow(fixture.uno, STANDARD, 150, fixture.twinCustomer, PODS.twin),
                        sentRow(fixture.uno, RENEWAL, 20, fixture.hiddenCustomer, PODS.hidden),
                    ],
                },
                { agente_id: fixture.due.id, dettaglio: [sentRow(fixture.due, STANDARD, 40, fixture.dueACustomer, PODS.dueA)] },
            ],
        });

        await expect(outcome(page).getByRole("status")).toHaveText("Salvataggio completato. Agenti salvati: 2.");
        await expect(outcome(page)).toContainText(`Bozza inviata per ${MONTH_LABEL}. Agenti: 2. Righe: 4. Totale: 385,50 €.`);
        expect(confirmationWrites(writes)).toEqual([CONFIRM_WRITE]);
    });

    test("should show the returned invite IDs and totals and open matching invites in Inviti when every agent is saved", async ({ page, backend }) => {
        let excludedInvite = 0;

        const fixture = await createAndPreview(page, backend, async (created) => {
            excludedInvite = await seedPreviousInvite(backend, created, created.escluso, "bozza");
        });

        await includeBox(page, fixture.escluso).click();
        await expand(page, fixture.uno);
        await amountInputs(page, fixture.twinCustomer).first().fill("175,50");

        const response = page.waitForResponse((candidate) => candidate.url().endsWith(CONFIRM_PATH));

        await confirmFromReview(page);

        const { risultati }: { risultati: SavedResult[] } = await (await response).json();
        const [unoResult, dueResult] = [fixture.uno, fixture.due].map((agent) => risultati.find((result) => result.agente_id === agent.id));

        expect(unoResult?.totale_invito).toBe(345.5);
        expect(dueResult?.totale_invito).toBe(80);

        await expect(outcome(page).getByRole("status")).toHaveText("Salvataggio completato. Agenti salvati: 2.");
        await expectCells(outcomeRow(page, fixture.uno), [fixture.uno.name, "Salvato", `#${unoResult?.invito_id}`, "345,50 €", "—"]);
        await expectCells(outcomeRow(page, fixture.due), [fixture.due.name, "Salvato", `#${dueResult?.invito_id}`, "80,00 €", "—"]);
        await expect(outcomeRow(page, fixture.escluso)).toHaveCount(0);

        await openTab(page, "Dashboard");
        await expect(outcome(page)).toBeHidden();
        await openTab(page, "Provvigioni");
        await expect(outcome(page).getByRole("status")).toHaveText("Salvataggio completato. Agenti salvati: 2.");

        await outcome(page).getByRole("button", { name: "Apri Inviti" }).click();

        await expect(agentRow(page, fixture.uno).getByRole("cell").nth(1)).toHaveText(MONTH_LABEL);
        await expect(agentRow(page, fixture.uno).getByRole("cell").nth(2)).toHaveText("345,50 €");
        await expect(agentRow(page, fixture.uno).getByRole("cell").nth(3)).toHaveText("Bozza");
        await expect(agentRow(page, fixture.due).getByRole("cell").nth(2)).toHaveText("80,00 €");
        await expect(agentRow(page, fixture.escluso).getByRole("cell").nth(2)).toHaveText("11,00 €");

        await expectInviteDetails(page, fixture.uno, [
            detailCells(sentRow(fixture.uno, STANDARD, 175.5, fixture.twinCustomer, PODS.twin), "175,50 €"),
            detailCells(sentRow(fixture.uno, STANDARD, 150, fixture.twinCustomer, PODS.twin), "150,00 €"),
            detailCells(sentRow(fixture.uno, RENEWAL, 20, fixture.hiddenCustomer, PODS.hidden), "20,00 €"),
        ]);
        await expectInviteDetails(page, fixture.escluso, [
            detailCells(sentRow(fixture.escluso, STANDARD, 11, fixture.previousCustomer, PODS.previous), "11,00 €"),
        ]);

        const excludedInvites = await backend.invites(fixture.escluso);

        expect(excludedInvites.map((invite) => [invite.id, invite.totale_invito, invite.stato])).toEqual([[excludedInvite, 11, "bozza"]]);
    });

    test("should keep the outcome tied to the sent draft and replace the same invite without duplicates when the edited draft is confirmed again", async ({
        page,
        backend,
    }) => {
        const fixture = await createAndPreview(page, backend);
        const first = page.waitForResponse((candidate) => candidate.url().endsWith(CONFIRM_PATH));

        await confirmFromReview(page);

        const firstBody: { risultati: SavedResult[] } = await (await first).json();
        const unoInvite = firstBody.risultati.find((result) => result.agente_id === fixture.uno.id)?.invito_id;
        const snapshot = `Bozza inviata per ${MONTH_LABEL}. Agenti: 3. Righe: 6. Totale: 407,00 €.`;

        await expect(outcome(page).getByRole("status")).toHaveText("Salvataggio completato. Agenti salvati: 3.");
        await expect(outcome(page)).toContainText(snapshot);
        await expect(page.getByText(CHANGED_AFTER_SAVE)).toBeHidden();

        await expand(page, fixture.uno);
        await amountInputs(page, fixture.twinCustomer).first().fill("175,50");

        await expect(page.getByText(CHANGED_AFTER_SAVE)).toBeVisible();
        await expect(outcome(page)).toContainText(snapshot);
        await expectCells(outcomeRow(page, fixture.uno), [fixture.uno.name, "Salvato", `#${unoInvite}`, "320,00 €", "—"]);
        await expect(agentTotal(page, fixture.uno)).toHaveText("345,50 €");
        await expect(confirmButton(page)).toBeEnabled();

        await confirmFromReview(page);

        await expect(outcome(page)).toContainText(`Bozza inviata per ${MONTH_LABEL}. Agenti: 3. Righe: 6. Totale: 432,50 €.`);
        await expectCells(outcomeRow(page, fixture.uno), [fixture.uno.name, "Salvato", `#${unoInvite}`, "345,50 €", "—"]);
        await expect(page.getByText(CHANGED_AFTER_SAVE)).toBeHidden();

        await outcome(page).getByRole("button", { name: "Apri Inviti" }).click();

        await expect(agentRow(page, fixture.uno)).toHaveCount(1);
        await expect(agentRow(page, fixture.uno).getByRole("cell").nth(2)).toHaveText("345,50 €");
        await expectInviteDetails(page, fixture.uno, [
            detailCells(sentRow(fixture.uno, STANDARD, 175.5, fixture.twinCustomer, PODS.twin), "175,50 €"),
            detailCells(sentRow(fixture.uno, STANDARD, 150, fixture.twinCustomer, PODS.twin), "150,00 €"),
            detailCells(sentRow(fixture.uno, RENEWAL, 20, fixture.hiddenCustomer, PODS.hidden), "20,00 €"),
        ]);

        const stored = await backend.invites(fixture.uno);

        expect(stored.map((invite) => [invite.id, invite.totale_invito])).toEqual([[unoInvite, 345.5]]);
    });

    test("should report a partial save with the backend reason and leave the sent invite untouched when one invite is no longer a draft", async ({
        page,
        backend,
    }) => {
        let sentInvite = 0;

        const fixture = await createAndPreview(page, backend, async (created) => {
            sentInvite = await seedPreviousInvite(backend, created, created.due, "inviato");
        });

        await confirmFromReview(page);

        await expect(outcome(page).getByRole("status")).toHaveText("Salvataggio parziale. Agenti salvati: 2. Agenti saltati: 1.");
        await expectCells(outcomeRow(page, fixture.due), [fixture.due.name, "Saltato", `#${sentInvite}`, "—", SKIPPED_REASON]);
        await expect(outcomeRow(page, fixture.uno).getByRole("cell").nth(1)).toHaveText("Salvato");
        await expect(outcomeRow(page, fixture.uno).getByRole("cell").nth(3)).toHaveText("320,00 €");
        await expect(outcome(page).getByText("Salvataggio completato")).toHaveCount(0);

        await outcome(page).getByRole("button", { name: "Apri Inviti" }).click();

        await expect(agentRow(page, fixture.due).getByRole("cell").nth(2)).toHaveText("11,00 €");
        await expect(agentRow(page, fixture.due).getByRole("cell").nth(3)).toHaveText("Inviato");
        await expectInviteDetails(page, fixture.due, [
            detailCells(sentRow(fixture.due, STANDARD, 11, fixture.previousCustomer, PODS.previous), "11,00 €"),
        ]);

        const stored = await backend.invites(fixture.due);

        expect(stored.map((invite) => [invite.id, invite.totale_invito, invite.stato])).toEqual([[sentInvite, 11, "inviato"]]);
    });

    test("should show an informational outcome and no success message when every included agent is skipped", async ({ page, backend }) => {
        let sentInvite = 0;

        const fixture = await createAndPreview(page, backend, async (created) => {
            sentInvite = await seedPreviousInvite(backend, created, created.due, "inviato");
        });

        await includeBox(page, fixture.uno).click();
        await includeBox(page, fixture.escluso).click();
        await confirmFromReview(page);

        await expect(outcome(page).getByRole("status")).toHaveText(
            "Nessun invito salvato: tutti gli agenti sono stati saltati. Agenti saltati: 1.",
        );
        await expectCells(outcomeRow(page, fixture.due), [fixture.due.name, "Saltato", `#${sentInvite}`, "—", SKIPPED_REASON]);
        await expect(outcome(page).getByText("Salvataggio completato")).toHaveCount(0);
        await expect(outcome(page).getByText("Salvato", { exact: true })).toHaveCount(0);

        expect(await backend.invites(fixture.uno)).toEqual([]);
        expect(await backend.invites(fixture.escluso)).toEqual([]);
    });

    test("should send one write, lock the draft and show one outcome when the save button is double-clicked", async ({ page, backend }) => {
        const fixture = await createAndPreview(page, backend);
        const writes = recordApiWrites(page);
        const release = await holdConfirmations(page);

        await expand(page, fixture.uno);
        await confirmButton(page).click();
        await saveButton(page).dblclick();

        await expect(outcome(page).getByRole("status")).toHaveText("Salvataggio in corso...");
        await expect(confirmButton(page)).toBeDisabled();
        await expect(confirmButton(page)).toHaveAccessibleDescription(SUBMITTING_BLOCK);
        await expect(previewButton(page)).toBeDisabled();
        await expect(monthGroup(page).getByRole("button", { name: /^[a-z]+ \d{4}$/ })).toBeDisabled();
        await expect(includeBox(page, fixture.uno)).toBeDisabled();
        await expect(amountInputs(page, fixture.twinCustomer).first()).not.toBeEditable();
        await expect(page.getByRole("button", { name: `Rimuovi la riga di ${fixture.hiddenCustomer}` })).toBeDisabled();
        expect(confirmationWrites(writes)).toEqual([CONFIRM_WRITE]);

        release();

        await expect(outcome(page).getByRole("status")).toHaveText("Salvataggio completato. Agenti salvati: 3.");
        await expect(outcome(page)).toHaveCount(1);
        await expect(amountInputs(page, fixture.twinCustomer).first()).toBeEditable();
        await expect(confirmButton(page)).toBeEnabled();
        expect(confirmationWrites(writes)).toEqual([CONFIRM_WRITE]);
        expect(await backend.invites(fixture.uno)).toHaveLength(1);
    });

    test("should send one write and show one outcome when Enter is pressed repeatedly on the save button", async ({ page, backend }) => {
        const fixture = await createAndPreview(page, backend);
        const writes = recordApiWrites(page);
        const release = await holdConfirmations(page);

        await confirmButton(page).click();
        await saveButton(page).focus();

        for (let press = 0; press < 3; press += 1) await page.keyboard.press("Enter");

        await expect(outcome(page).getByRole("status")).toHaveText("Salvataggio in corso...");
        await expect(confirmButton(page)).toBeDisabled();
        expect(confirmationWrites(writes)).toEqual([CONFIRM_WRITE]);

        release();

        await expect(outcome(page).getByRole("status")).toHaveText("Salvataggio completato. Agenti salvati: 3.");
        await expect(outcome(page)).toHaveCount(1);
        await expect(reviewDialog(page)).toBeHidden();
        expect(confirmationWrites(writes)).toEqual([CONFIRM_WRITE]);
        expect(await backend.invites(fixture.uno)).toHaveLength(1);
    });

    // The real backend can't be made to reject a well-formed draft, so these responses are injected at the browser.
    test("should keep the edits and show the backend message without saving anything when the save is rejected with 400 or 404", async ({
        page,
        backend,
    }) => {
        const fixture = await createAndPreview(page, backend);
        const writes = recordApiWrites(page);
        const validation = `Riga con 'importo_provvigione' mancante o non numerico per l'agente ${fixture.uno.id}.`;
        const unknownAgent = `Agente con id ${fixture.uno.id} non trovato.`;
        const alert = outcome(page).getByRole("alert");

        await expand(page, fixture.uno);
        await amountInputs(page, fixture.twinCustomer).first().fill("175,50");
        await page.route(`**${CONFIRM_PATH}`, (route) => route.fulfill({ status: 400, json: { error: validation } }));

        await confirmFromReview(page);

        await expect(alert).toContainText("Salvataggio rifiutato");
        await expect(alert).toContainText(validation);
        await expect(alert).toContainText(REJECTED_DESCRIPTION);
        await expectAmounts(amountInputs(page, fixture.twinCustomer), ["175,50", "150,00"]);
        await expect(agentTotal(page, fixture.uno)).toHaveText("345,50 €");
        await expect(confirmButton(page)).toBeEnabled();

        await page.unroute(`**${CONFIRM_PATH}`);
        await page.route(`**${CONFIRM_PATH}`, (route) => route.fulfill({ status: 404, json: { error: unknownAgent } }));

        await confirmFromReview(page);

        await expect(alert).toContainText(unknownAgent);
        await expect(alert).not.toContainText(validation);
        await expectAmounts(amountInputs(page, fixture.twinCustomer), ["175,50", "150,00"]);
        await expect(overallTotal(page)).toHaveText("432,50 €");
        expect(confirmationWrites(writes)).toEqual([CONFIRM_WRITE, CONFIRM_WRITE]);

        for (const agent of [fixture.uno, fixture.due, fixture.escluso]) expect(await backend.invites(agent)).toEqual([]);
    });

    // The request reaches the real backend and saves, but the browser never sees the answer.
    test("should explain the unknown outcome and never resend when the response to a save is lost", async ({ page, backend }) => {
        const fixture = await createAndPreview(page, backend);
        const writes = recordApiWrites(page);
        const alert = outcome(page).getByRole("alert");

        await expand(page, fixture.uno);
        await amountInputs(page, fixture.twinCustomer).first().fill("175,50");
        await page.route(`**${CONFIRM_PATH}`, async (route) => {
            await route.fetch();
            await route.abort("failed");
        });

        await confirmFromReview(page);

        await expect(alert).toContainText("Esito del salvataggio sconosciuto");
        await expect(alert).toContainText(UNKNOWN_DESCRIPTION);
        await expect(outcome(page)).not.toContainText(REJECTED_DESCRIPTION);
        await expect(confirmButton(page)).toBeEnabled();
        expect(confirmationWrites(writes)).toEqual([CONFIRM_WRITE]);

        await outcome(page).getByRole("button", { name: "Apri Inviti" }).click();

        await expect(agentRow(page, fixture.uno).getByRole("cell").nth(2)).toHaveText("345,50 €");
        await expect(agentRow(page, fixture.uno).getByRole("cell").nth(3)).toHaveText("Bozza");

        await openTab(page, "Provvigioni");

        await expect(alert).toContainText("Esito del salvataggio sconosciuto");
        await expand(page, fixture.uno);
        await expectAmounts(amountInputs(page, fixture.twinCustomer), ["175,50", "150,00"]);
        expect(confirmationWrites(writes)).toEqual([CONFIRM_WRITE]);
        expect(await backend.invites(fixture.uno)).toHaveLength(1);
    });
});
