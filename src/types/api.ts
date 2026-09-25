import type { Rule } from "./domain";

export interface CreateAgentRequest {
    nome_cognome: string;
    agente_padre?: string;
    mail?: string;
    statistiche?: boolean;
    percentuale_provvigione_figlio?: number;
}

export interface AgentCreateResponse {
    message: string;
    agente_id: number;
}

export interface AgentMessageResponse {
    message: string;
}

export interface UpdateRuleRequest {
    utilizzato?: boolean;
    valore_default?: number;
    tipo_utenza?: "residenziale" | "business" | null;
    tipo_servizio?: "gas" | "luce" | null;
}

export interface UpdateRuleResponse {
    success: boolean;
    message: string;
    regola: Rule;
}

export interface ImportRulesResponse {
    success: boolean;
    message: string;
}

export interface UpdateTierRequest {
    tipo_utenza?: "residenziale" | "business" | null;
    tipo_servizio?: "gas" | "luce" | null;
}

export interface ImportTiersResponse {
    success: boolean;
    message: string;
}

export interface SaveRuleConfigurationRequest {
    valori: Array<{ regola_id: number; scaglione_id: number; valore: number }>;
}

export interface ImportExcelResponse {
    message: string;
    details: {
        clienti: { nuovi: number; aggiornati: number };
        prodotti: { nuovi: number; aggiornati: number };
        dati_tecnici: { nuovi: number; aggiornati: number };
        ordini: { nuovi: number; aggiornati: number };
    };
}

export interface ImportSettlementsResponse {
    success: boolean;
    message: string;
    error?: string;
}

export interface CommissionData {
    cf_piva: string;
    cliente: string;
    comp_al: string;
    importo_provvigione: number | null;
    pod_pdr: string;
    regola: string;
    venditore: string;
}

export interface SellerCalculationResult {
    totale_provvigione: number;
    dati_provvigione: CommissionData[];
}

export interface CalculationResult {
    [sellerName: string]: SellerCalculationResult;
}

export type UnpaidCalculationResponse =
    | { kind: "data"; totale_provvigione: number; dati_provvigione: CommissionData[] }
    | { kind: "empty"; message: string };

export interface CalculationInput {
    venditore: string;
    regola: string;
    scaglione_consumo: string;
    importo_euro: number;
    pod_pdr: string;
    cliente: string;
    cf_piva: string;
    comp_al: string;
    [key: string]: string | number | undefined;
}

export interface PendingOrder {
    id_riga_ordine: string;
    id_ordine: number;
    data_firma: string | null;
    stato_firma: string | null;
    data_conferma: string | null;
    data_accettazione: string | null;
    stato: string | null;
    agenzia: string | null;
    agente: string | null;
    prodotto: string;
    note: string | null;
    cod_fisc: string;
    pod_pdr: string;
    metodo_pagam: string | null;
    cliente_nome: string | null;
}

export interface PendingOrdersResponse {
    count: number;
    data: PendingOrder[];
}

export interface OrderExclusion {
    id: number;
    id_riga_ordine: string;
    motivo: string;
    data_esclusione: string | null;
}

export interface ExcludedOrder extends OrderExclusion {
    ordine: PendingOrder | null;
}

export interface ExcludedOrdersResponse {
    count: number;
    data: ExcludedOrder[];
}

export interface InvoiceRequestDetailsRow {
    id: number;
    venditore: string | null;
    comp_al: string | null;
    regola: string | null;
    importo_provvigione: number;
    pod_pdr: string | null;
    cliente: string | null;
    cf_piva: string | null;
}

export interface InvoiceRequestDetailsResponse {
    invito_id: number;
    totale_invito: number;
    count: number;
    dati: InvoiceRequestDetailsRow[];
}

export type AttachmentStatus = "in_attesa" | "caricato" | "errore";

export interface InvoiceRequestAttachment {
    id: number;
    storico_invito_id: number;
    nome_file: string;
    content_type: string;
    chiave_oggetto: string;
    dimensione_bytes: number | null;
    stato: AttachmentStatus;
    data_creazione: string | null;
    data_caricamento: string | null;
}

export interface UploadUrlResponse {
    allegato_id: number;
    chiave_oggetto: string;
    upload_url: string;
    metodo: "PUT";
    scadenza_secondi: number;
    headers_richiesti: { "Content-Type": string };
    stato: AttachmentStatus;
}

export interface DownloadUrlResponse {
    download_url: string;
    metodo: "GET";
    scadenza_secondi: number;
    nome_file: string;
}

export interface DashboardTotalContracts {
    anno_riferimento: number;
    totale_contratti_n: number;
    totale_contratti_n_1: number;
    variazione_percentuale: number;
}

export interface DashboardTotalCommissions {
    anno_riferimento: number;
    totale_provvigioni_n: number;
    totale_provvigioni_n_1: number;
    variazione_percentuale: number;
    valuta: string;
}

export interface DashboardContractMonth {
    mese_nome: string;
    mese_num: number;
    anno_n: number;
    anno_n_1: number;
}

export interface DashboardMonthlyContracts {
    anno_riferimento: number;
    dati: DashboardContractMonth[];
}

export interface DashboardCommissionMonth {
    mese_nome: string;
    mese_num: number;
    provvigioni_n: number;
    provvigioni_n_1: number;
}

export interface DashboardMonthlyCommissions {
    anno_riferimento: number;
    unita_misura: string;
    dati: DashboardCommissionMonth[];
}

export interface DashboardProductContracts {
    prodotto: string;
    anno_n: number;
    anno_n_1: number;
}

export interface DashboardContractsByProduct {
    anno_riferimento: number;
    dati: DashboardProductContracts[];
}

export interface UpdateInvoiceRequestPayload {
    stato?: "bozza" | "inviato" | "approvato";
    riferimento_fattura?: string;
    data_fattura?: string;
    pagato?: boolean;
    data_pagamento?: string;
}

export interface CheckAgentsResponse {
    matches: string[];
    not_found: string[];
    stats: {
        total_input: number;
        matched_count: number;
        not_found_count: number;
    };
}

export interface DeleteSettlementsResponse {
    success: boolean;
    competenza_liquidazione: string;
    righe_eliminate: number;
}

export interface PreviewRequest {
    competenza_liquidazione: string;
}

export interface CalculationDetail {
    venditore: string | null;
    comp_al: string | null;
    regola: string | null;
    importo_provvigione: number;
    pod_pdr: string | null;
    cliente: string | null;
    cf_piva: string | null;
}

export interface PreviewAgent {
    agente_id: number;
    nome_agente: string | null;
    totale_provvigione: number;
    dettaglio: CalculationDetail[];
}

export interface UnmatchedSettlement {
    venditore: string | null;
    comp_al: string | null;
    regola: string | null;
    scaglione_consumo: string | null;
    importo_euro: number | null;
    pod_pdr: string | null;
    cliente: string | null;
    cf_piva: string | null;
}

export interface PreviewResponse {
    competenza_liquidazione: string;
    agenti: PreviewAgent[];
    non_associati: UnmatchedSettlement[];
}

export interface ConfirmationDetail {
    importo_provvigione: number;
    venditore?: string | null;
    comp_al?: string | null;
    regola?: string | null;
    pod_pdr?: string | null;
    cliente?: string | null;
    cf_piva?: string | null;
}

export interface ConfirmationAgent {
    agente_id: number;
    dettaglio: ConfirmationDetail[];
}

export interface ConfirmationRequest {
    mese_competenza: string;
    agenti: ConfirmationAgent[];
}

export interface SavedConfirmationResult {
    salvato: true;
    agente_id: number;
    invito_id: number;
    totale_invito: number;
}

export interface SkippedConfirmationResult {
    salvato: false;
    agente_id: number;
    invito_id: number;
    motivo: string;
}

export type ConfirmationResult = SavedConfirmationResult | SkippedConfirmationResult;

export interface ConfirmationResponse {
    mese_competenza: string;
    risultati: ConfirmationResult[];
}

export interface UnpaidCalculationRequest {
    agente_id: number;
    mesi_competenza: string[];
}
