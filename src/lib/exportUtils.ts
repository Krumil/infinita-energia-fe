import type { PendingOrder, CommissionData } from "@/types";
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

export function commissionToRow(item: CommissionData): (string | number)[] {
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
