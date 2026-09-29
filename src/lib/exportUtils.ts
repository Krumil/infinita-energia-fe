import type { PendingOrder } from "@/types";
import { formatDate } from "@/lib/utils";

class SpreadsheetExportError extends Error {
    constructor(context: string) {
        super(`Failed to export ${context}: expected an ArrayBuffer from SheetJS`);
        this.name = "SpreadsheetExportError";
    }
}

export const COMMISSION_HEADERS = [
    "Cliente",
    "CF/PIVA",
    "POD/PDR",
    "Comp. al",
    "Regola",
    "Importo Provvigione",
    "Venditore",
] as const;

// Unpaid reports send non-null strings, while preview and saved invite rows may leave any text field empty.
export interface CommissionRow {
    cliente: string | null;
    cf_piva: string | null;
    pod_pdr: string | null;
    comp_al: string | null;
    regola: string | null;
    importo_provvigione: number | null;
    venditore: string | null;
}

export interface AgentWorkbook {
    agentId: number;
    agentName: string | null;
    rows: CommissionRow[];
    total: number;
}

export function commissionToRow(item: CommissionRow): (string | number | null)[] {
    return [
        item.cliente,
        item.cf_piva,
        item.pod_pdr,
        item.comp_al,
        item.regola,
        item.importo_provvigione ?? 0,
        item.venditore,
    ];
}

// The ID keeps two agents with the same display name from overwriting each other in the ZIP.
export function agentWorkbookName(agentId: number, agentName: string | null): string {
    const name = (agentName ?? "").trim().replace(/[<>:"/\\|?*\s]+/g, "_") || "AGENTE";

    return `${name}-${agentId}.xlsx`;
}

async function createAgentWorkbook(workbook: AgentWorkbook): Promise<Uint8Array> {
    const XLSX = await import("xlsx");

    const summaryRow = ["TOTALE", "", "", "", "", workbook.total, workbook.agentName ?? ""];
    const worksheet = XLSX.utils.aoa_to_sheet([[...COMMISSION_HEADERS], ...workbook.rows.map(commissionToRow), summaryRow]);

    worksheet["!cols"] = [
        { wch: 30 }, // Cliente
        { wch: 20 }, // CF/PIVA
        { wch: 25 }, // POD/PDR
        { wch: 12 }, // Comp. al
        { wch: 40 }, // Regola
        { wch: 18 }, // Importo Provvigione
        { wch: 25 }, // Venditore
    ];

    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, worksheet, "Provvigioni");

    const buffer: unknown = XLSX.write(book, { type: "array", bookType: "xlsx" });

    if (!(buffer instanceof ArrayBuffer)) {
        throw new SpreadsheetExportError(`commissions for agent ${workbook.agentId}`);
    }

    return new Uint8Array(buffer);
}

// One workbook per agent inside a YYYY-MM folder, the layout the operators already file.
export async function zipAgentWorkbooks(month: string, workbooks: AgentWorkbook[]): Promise<Blob> {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const workbook of workbooks) {
        zip.file(`${month}/${agentWorkbookName(workbook.agentId, workbook.agentName)}`, await createAgentWorkbook(workbook));
    }

    return zip.generateAsync({ type: "blob" });
}

export async function exportPendingOrdersExcel(orders: PendingOrder[]): Promise<void> {
    const XLSX = await import("xlsx");

    const headers = ["ID Ordine", "Cliente", "POD/PDR", "Prodotto", "Agente", "Stato", "Data Firma", "Metodo Pagamento"];

    const rows = orders.map((o) => [
        o.id_ordine,
        o.cliente_nome || "",
        o.pod_pdr,
        o.prodotto,
        o.agente || "",
        o.stato || "",
        formatDate(o.data_firma, ""),
        o.metodo_pagam || "",
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    worksheet["!cols"] = [
        { wch: 12 },  // ID Ordine
        { wch: 30 },  // Cliente
        { wch: 25 },  // POD/PDR
        { wch: 15 },  // Prodotto
        { wch: 20 },  // Agente
        { wch: 15 },  // Stato
        { wch: 12 },  // Data Firma
        { wch: 18 },  // Metodo Pagamento
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ordini Inevasi");

    const buffer: unknown = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

    if (!(buffer instanceof ArrayBuffer)) {
        throw new SpreadsheetExportError("pending orders");
    }

    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    downloadBlob(blob, "ordini-inevasi.xlsx");
}

/**
 * Triggers browser download of a Blob file.
 * @param blob - File content
 * @param filename - Suggested filename
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
