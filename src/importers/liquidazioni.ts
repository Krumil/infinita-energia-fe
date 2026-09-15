import type { CalculationInput, Settlement } from "@/types";
import { parseEuroNumber } from "@/lib/numbers";
import { parseExcelFile } from "./excel";

function parseAndFormatDate(dateStr: string | number | undefined): string | undefined {
    if (dateStr === undefined || dateStr === null || dateStr === "") {
        return undefined;
    }

    const str = String(dateStr).trim();

    if (!str) return undefined;

    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (slashMatch) {
        const [, day, month, year] = slashMatch;

        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);

    if (dashMatch) {
        const [, day, month, year] = dashMatch;

        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

    if (isoMatch) {
        const [, year, month, day] = isoMatch;

        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    return str;
}

export function convertToCalculationInput(settlements: Settlement[]): CalculationInput[] {
    return settlements.map((settlement) => ({
        venditore: settlement.venditore || "",
        regola: settlement.regola || "",
        scaglione_consumo: settlement.scaglione_consumo || "",
        importo_euro: settlement.importo_euro || 0,
        pod_pdr: settlement.pod_pdr || "",
        cliente: settlement.cliente || "",
        cf_piva: settlement.cf_piva || "",
        comp_al: settlement.comp_al || "",
    }));
}

export async function parseSettlementsExcel(file: File): Promise<Settlement[]> {
    const rawData = await parseExcelFile<Record<string, string | number>>(file);

    const columnKeysLower =
        rawData.length > 0
            ? new Map<string, string>(Object.keys(rawData[0]).map((key) => [key.toLowerCase(), key]))
            : new Map<string, string>();

    return rawData.map((row) => {
        const settlement: Settlement = {};

        const findValue = (alternatives: string[]): string | number | undefined => {
            for (const alt of alternatives) {
                if (row[alt] !== undefined && row[alt] !== "") {
                    return row[alt];
                }

                const actualKey = columnKeysLower.get(alt.toLowerCase());

                if (actualKey && row[actualKey] !== undefined && row[actualKey] !== "") {
                    return row[actualKey];
                }
            }

            return undefined;
        };

        const mappings: Array<[keyof Settlement, string[]]> = [
            ["piano_provvigionale", ["piano_provvigionale", "Piano Provvigionale"]],
            ["regola", ["regola", "Regola"]],
            ["consumo", ["consumo", "Consumo"]],
            ["quantita", ["quantita", "quantità", "Quantità"]],
            ["prezzo", ["prezzo", "Prezzo"]],
            ["udm", ["udm", "Udm", "UdM", "UDM"]],
            ["importo_euro", ["importo_euro", "importo_€", "Importo €", "Importo Euro"]],
            ["comp_dal", ["comp_dal", "Comp. Dal", "Comp. dal"]],
            ["comp_al", ["comp_al", "Comp. Al", "Comp. al"]],
            ["scaglione_consumo", ["scaglione_consumo", "Scaglione Consumo", "Scaglione consumo"]],
            ["scaglione_anno", ["scaglione_anno", "Scaglione Anno", "Scaglione anno"]],
            ["pod_pdr", ["pod_pdr", "podpdr", "POD/PDR", "Pod/Pdr"]],
            ["punto", ["punto", "Punto"]],
            ["inizio_forn", ["inizio_forn", "Inizio Forn.", "Inizio forn."]],
            ["fine_forn", ["fine_forn", "Fine Forn.", "Fine forn."]],
            ["id_ordine", ["id_ordine", "ID Ordine", "Id Ordine", "Id ordine"]],
            ["data_firma", ["data_firma", "Data Firma", "Data firma"]],
            [
                "data_prima_accettazione",
                ["data_prima_accettazione", "Data Prima Accettazione", "Data prima accettazione"],
            ],
            ["cod_prodotto", ["cod_prodotto", "Cod. Prodotto", "Cod. prodotto"]],
            ["prodotto", ["prodotto", "Prodotto"]],
            ["tipo_cliente", ["tipo_cliente", "Tipo Cliente", "Tipo cliente"]],
            ["partner_comm", ["partner_comm", "Partner Comm.", "Partner comm."]],
            ["venditore", ["venditore", "Venditore"]],
            ["fatture", ["fatture", "Fatture"]],
            ["cliente", ["cliente", "Cliente"]],
            ["cf_piva", ["cf_piva", "cfpiva", "CF/P.IVA", "C.F./P.IVA"]],
            ["indirizzo_fornitura", ["indirizzo_fornitura", "Indirizzo Fornitura", "Indirizzo fornitura"]],
            ["amministratore", ["amministratore", "Amministratore"]],
            ["metodo_di_pagamento", ["metodo_di_pagamento", "Metodo di Pagamento", "Metodo di pagamento"]],
            [
                "competenza_liquidazione",
                ["competenza_liquidazione", "Competenza Liquidazione", "Comp. Liquidazione", "COMPETENZA"],
            ],
        ];

        for (const [key, alternatives] of mappings) {
            const value = findValue(alternatives);

            if (value !== undefined) {
                if (key === "consumo" || key === "quantita" || key === "prezzo" || key === "importo_euro" || key === "scaglione_anno" || key === "id_ordine" || key === "id") {
                    settlement[key] = parseEuroNumber(value);
                } else if (key === "competenza_liquidazione") {
                    const str = String(value).trim();
                    const mmYYYYMatch = str.match(/^(\d{1,2})\/(\d{4})$/);

                    if (mmYYYYMatch) {
                        const [, month, year] = mmYYYYMatch;
                        settlement[key] = `${year}-${month.padStart(2, "0")}-01`;
                    } else {
                        const isoMatch = str.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);

                        if (isoMatch) {
                            const [, year, month, day] = isoMatch;
                            settlement[key] =
                                `${year}-${month.padStart(2, "0")}-${(day || "01").padStart(2, "0")}`;
                        } else {
                            settlement[key] = str;
                        }
                    }
                } else if (key === "comp_dal" || key === "comp_al" || key === "inizio_forn" || key === "fine_forn" || key === "data_firma" || key === "data_prima_accettazione") {
                    settlement[key] = parseAndFormatDate(value);
                } else {
                    settlement[key] = String(value);
                }
            }
        }

        return settlement;
    });
}
