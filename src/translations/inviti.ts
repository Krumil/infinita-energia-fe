export const invoiceRequestsEn = {
    editTab: "Edit",
    detailTab: "Detail",
    attachmentsTab: "Attachments",
    detailTitle: "Invitation detail",
    detailDescription: "Commission rows included in this invitation",
    detailUnavailable: "No saved detail is available. Invitations calculated before this feature may have no detail.",
    detailLoadFailed: "Unable to load invitation detail.",
    retry: "Retry",
    refresh: "Refresh",
    seller: "Seller",
    competenceTo: "Competence to",
    rule: "Rule",
    podPdr: "POD/PDR",
    customer: "Customer",
    taxId: "Tax ID",
    commissionAmount: "Commission amount",
    total: "Total",
} as const;

export const invoiceRequestsIt = {
    editTab: "Modifica",
    detailTab: "Dettaglio",
    attachmentsTab: "Allegati",
    detailTitle: "Dettaglio invito",
    detailDescription: "Righe di provvigione incluse nell'invito",
    detailUnavailable: "Non è disponibile un dettaglio salvato. Gli inviti calcolati prima di questa funzione potrebbero esserne privi.",
    detailLoadFailed: "Impossibile caricare il dettaglio dell'invito.",
    retry: "Riprova",
    refresh: "Aggiorna",
    seller: "Venditore",
    competenceTo: "Competenza al",
    rule: "Regola",
    podPdr: "POD/PDR",
    customer: "Cliente",
    taxId: "CF/P.IVA",
    commissionAmount: "Importo provvigione",
    total: "Totale",
} as const;

export type InvoiceRequestsTranslationKey = keyof typeof invoiceRequestsEn;

export interface InvoiceRequestsTranslations {
    editTab: string;
    detailTab: string;
    attachmentsTab: string;
    detailTitle: string;
    detailDescription: string;
    detailUnavailable: string;
    detailLoadFailed: string;
    retry: string;
    refresh: string;
    seller: string;
    competenceTo: string;
    rule: string;
    podPdr: string;
    customer: string;
    taxId: string;
    commissionAmount: string;
    total: string;
}
