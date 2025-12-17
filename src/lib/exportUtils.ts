import type { CalcoloResult, ProvvigioneData } from "@/types";

/**
 * Parses comp_dal date string to a Date object.
 * Handles multiple date formats:
 * - DD/MM/YYYY (Italian format)
 * - YYYY-MM-DD (ISO format)
 * - Excel serial number (days since 1900-01-01)
 * @returns Date object or null if parsing fails
 */
function parseCompDalToDate(compDal: string | undefined): Date | null {
    if (!compDal || compDal.trim() === "") {
        return null;
    }

    const value = compDal.trim();
    let date: Date | null = null;

    // Try Excel serial number (numeric string)
    if (/^\d+(\.\d+)?$/.test(value)) {
        const serial = parseFloat(value);
        date = new Date((serial - 25569) * 86400 * 1000);
    }
    // Try Italian format DD/MM/YYYY
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
        const parts = value.split("/");
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        date = new Date(year, month, day);
    }
    // Try ISO format YYYY-MM-DD
    else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        date = new Date(value);
    }
    // Try ISO format with time YYYY-MM-DDTHH:mm:ss
    else if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
        date = new Date(value);
    }

    if (date && !isNaN(date.getTime())) {
        return date;
    }

    return null;
}

/**
 * Formats the period for display (e.g., "Gennaio 2025" or "January 2025").
 * @param compDal - The comp_dal date string
 * @param locale - The locale for month name formatting ("it" or "en")
 * @returns Formatted period string (e.g., "Gennaio 2025") or null if parsing fails
 */
export function formatPeriodDisplay(compDal: string | undefined, locale: string = "it"): string | null {
    const date = parseCompDalToDate(compDal);
    if (!date) {
        return null;
    }

    const monthName = date.toLocaleDateString(locale === "it" ? "it-IT" : "en-US", { month: "long" });
    const year = date.getFullYear();

    // Capitalize first letter
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    return `${capitalizedMonth} ${year}`;
}

/**
 * Extracts YYYY-MM folder name from comp_dal date string.
 * @returns Folder name in "YYYY-MM" format, or "unknown-period" if parsing fails
 */
export function extractPeriodFromCompDal(compDal: string | undefined): string {
    const date = parseCompDalToDate(compDal);
    if (!date) {
        return "unknown-period";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

/**
 * Sanitizes a filename by replacing invalid characters.
 */
function sanitizeFilename(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, "_");
}

/**
 * Creates an Excel workbook (binary) for a single seller's commissions.
 * @param sellerName - Name of the seller (used in header)
 * @param data - Array of ProvvigioneData records
 * @param totalCommission - Pre-calculated total commission
 * @returns Binary Excel file content (Uint8Array)
 */
export async function createSellerExcel(
    sellerName: string,
    data: ProvvigioneData[],
    totalCommission: number
): Promise<Uint8Array> {
    const XLSX = await import("xlsx");

    // Define headers
    const headers = ["Cliente", "CF/PIVA", "POD/PDR", "Comp. al", "Regola", "Importo Provvigione", "Venditore"];

    // Create data rows
    const rows = data.map((item) => [
        item.cliente,
        item.cf_piva,
        item.pod_pdr,
        item.comp_al,
        item.regola,
        item.importo_provvigione ?? 0,
        item.venditore,
    ]);

    // Add summary row
    const summaryRow = ["TOTALE", "", "", "", "", totalCommission, sellerName];

    // Combine all data
    const worksheetData = [headers, ...rows, summaryRow];

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths for better readability
    worksheet["!cols"] = [
        { wch: 30 }, // Cliente
        { wch: 20 }, // CF/PIVA
        { wch: 25 }, // POD/PDR
        { wch: 12 }, // Comp. al
        { wch: 40 }, // Regola
        { wch: 18 }, // Importo Provvigione
        { wch: 25 }, // Venditore
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Provvigioni");

    // Write to binary array
    const excelBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;

    return excelBuffer;
}

/**
 * Generates a ZIP file containing Excel files for each seller.
 * @param result - CalcoloResult with seller data
 * @param periodFolder - Folder name (YYYY-MM format)
 * @returns Blob of the ZIP file
 */
export async function generateCommissionsZip(result: CalcoloResult, periodFolder: string): Promise<Blob> {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    // Create folder with period name
    const folder = zip.folder(periodFolder);
    if (!folder) {
        throw new Error("Failed to create ZIP folder");
    }

    // Generate Excel file for each seller
    for (const [sellerName, sellerData] of Object.entries(result)) {
        const excelBuffer = await createSellerExcel(
            sellerName,
            sellerData.dati_provvigione,
            sellerData.totale_provvigione
        );

        const safeFilename = sanitizeFilename(sellerName);
        folder.file(`${safeFilename}.xlsx`, excelBuffer);
    }

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ type: "blob" });

    return zipBlob;
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
