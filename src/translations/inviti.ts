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
    searchAgent: "Search agent...",
    noAgentFound: "No agent found",
    paymentBeforeInvoice: "The payment date can't be earlier than the invoice date.",
    paidDraft: "A draft invite can't be paid: change its status first.",
    paidWithoutInvoice: "Add the invoice reference before marking the invite paid.",
    serverError: "The server hit an error. Try again in a moment.",
    clearMonth: "Clear",
    pickerYear: "Year",
    pickerMonth: "Month",
    pickerPreviousYear: "Previous year",
    pickerNextYear: "Next year",
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
    searchAgent: "Cerca agente...",
    noAgentFound: "Nessun agente trovato",
    paymentBeforeInvoice: "La data di pagamento non può essere precedente alla data fattura.",
    paidDraft: "Un invito in bozza non può essere pagato: cambia prima lo stato.",
    paidWithoutInvoice: "Inserisci il riferimento fattura prima di segnare l'invito come pagato.",
    serverError: "Il server ha riscontrato un errore. Riprova tra poco.",
    clearMonth: "Cancella",
    pickerYear: "Anno",
    pickerMonth: "Mese",
    pickerPreviousYear: "Anno precedente",
    pickerNextYear: "Anno successivo",
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
    serverError: string;
}
