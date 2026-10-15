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

export type UnpaidCalculationResponse =
    | { kind: "data"; totale_provvigione: number; dati_provvigione: CommissionData[] }
    | { kind: "empty"; message: string };

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

export interface DashboardPeriod {
    anno_n: number;
    anno_n_1: number;
    dal_n: string;
    al_n: string;
    dal_n_1: string;
    al_n_1: string;
    parziale: boolean;
}

export interface DashboardSalesSplit {
    luce: number;
    gas: number;
    altro_udm: number;
    domestico: number;
    non_domestico: number;
    sepa: number;
    altri_metodi: number;
    pct_sepa: number | null;
}

export interface DashboardSalesSummary {
    periodo: DashboardPeriod;
    kpi: {
        contratti_n: number;
        contratti_n_1: number;
        variazione_pct: number | null;
    };
    split_n: DashboardSalesSplit;
    split_n_1: DashboardSalesSplit;
}

export interface DashboardMonth {
    mese: number;
    etichetta: string;
    n: number;
    n_1: number;
    variazione_pct: number | null;
}

export interface DashboardMonthlySales {
    periodo: DashboardPeriod;
    mesi: DashboardMonth[];
}

export interface DashboardAgentMetrics {
    contratti_totali: number;
    sepa: number;
    pct_sepa: number | null;
    luce: number;
    gas: number;
    altro_udm: number;
    domestico: number;
    non_domestico: number;
}

export interface DashboardAgentRow {
    agente_id: number;
    agente: string;
    n: DashboardAgentMetrics;
    n_1: DashboardAgentMetrics;
    variazione_pct: {
        contratti_totali: number | null;
        sepa: number | null;
        luce: number | null;
        gas: number | null;
        domestico: number | null;
        non_domestico: number | null;
    };
}

export interface DashboardAgentComparison {
    periodo: DashboardPeriod;
    min_contratti: number;
    ordina_per: "contratti_totali" | "pct_sepa";
    esclusi_sotto_soglia: number;
    contratti_agenti_non_statistiche_n: number;
    agenti: DashboardAgentRow[];
}

export interface DashboardPreviousSellers {
    periodo: DashboardPeriod;
    top_n: number;
    totale_contratti: number;
    senza_dato: number;
    venditori: { venditore: string; contratti: number }[];
}

export interface DashboardProductsByAgent {
    periodo: DashboardPeriod;
    agenti_evidenziati: string[];
    prodotti: {
        prodotto: string;
        totale: number;
        per_agente: { agente: string; contratti: number }[];
    }[];
}

export interface DashboardRevenue {
    periodo: DashboardPeriod;
    ultima_competenza_disponibile: string;
    valuta: string;
    kpi: {
        fatturato_n: number;
        fatturato_n_1: number;
        variazione_pct: number | null;
    };
    mesi: DashboardMonth[];
}

export interface UpdateInvoiceRequestPayload {
    stato?: "bozza" | "inviato" | "approvato";
    riferimento_fattura?: string;
    data_fattura?: string;
    pagato?: boolean;
    data_pagamento?: string;
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
