export const settlementsEn = {
    settlementNoRows: "No rows found in the selected file",
    settlementNoOrderIds: "No row in the file has an order ID (ID Ordine), so there's nothing to import.",
    settlementSkippedRows: "Rows without an order ID (ID Ordine) not imported: {count}.",
    settlementImportFailed: "Import failed",
    settlementDeleteFailed: "Deletion was not completed",
    settlementAlreadyImported: "This month already has liquidations, so the file wasn't imported. To replace them with the ones in the file, use the button below.",
} as const;

export const settlementsIt = {
    settlementNoRows: "Nessun dato trovato nel file selezionato",
    settlementNoOrderIds: "Nessuna riga del file ha un ID Ordine, quindi non c'è niente da importare.",
    settlementSkippedRows: "Righe senza ID Ordine non importate: {count}.",
    settlementImportFailed: "Importazione non riuscita",
    settlementDeleteFailed: "Eliminazione non completata",
    settlementAlreadyImported: "Questo mese ha già delle liquidazioni, quindi il file non è stato importato. Per sostituirle con quelle del file, usa il pulsante qui sotto.",
} as const;
