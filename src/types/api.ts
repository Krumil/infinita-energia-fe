// === AGENT API TYPES ===

export interface CreateAgentRequest {
    nome_cognome: string;
    agente_padre?: string;
    statistiche?: boolean;
    gettone_residenziale_standard?: number;
    gettone_residenziale_bonus?: number;
    gettone_residenziale_malus?: number;
    rinnovo_residenziale?: number;
    gettone_business_standard?: number;
    gettone_business_bonus?: number;
    gettone_business_malus?: number;
    rinnovo_business?: number;
    bonus_sdd?: number;
}

export interface AgentCreateResponse {
    message: string;
    id: number;
}

export interface AgentMessageResponse {
    message: string;
}

// === EXCEL IMPORT TYPES ===

export interface ImportExcelResponse {
    message: string;
    details: {
        clienti: { nuovi: number; aggiornati: number };
        prodotti: { nuovi: number; aggiornati: number };
        dati_tecnici: { nuovi: number; aggiornati: number };
        ordini: { nuovi: number; aggiornati: number };
    };
}

// === LIQUIDATION IMPORT TYPES ===

export interface ImportLiquidazioniResponse {
    success: boolean;
    message: string;
    error?: string;
}

// === COMMISSION CALCULATION TYPES ===

export interface ProvvigioneData {
    cf_piva: string;
    cliente: string;
    comp_al: string;
    importo_provvigione: number | null;
    pod_pdr: string;
    regola: string;
    venditore: string;
}

export interface CalcoloVenditoreResult {
    totale_provvigione: number;
    dati_provvigione: ProvvigioneData[];
}

export interface CalcoloResult {
    [venditoreName: string]: CalcoloVenditoreResult;
}

// Liquidation record for calculation input
// Uses original column names with spaces/special chars as expected by backend
export interface CalcoloInput {
    "Partner Comm.": string;
    Regola: string;
    "Tipo Cliente": string;
    Venditore: string;
    Consumo: number;
    Quantità: number;
    "Importo €": number;
    [key: string]: string | number | undefined;
}

// === BULK IMPORT TYPES ===

// CSV Agent row type (for bulk import)
export interface AgentCsvRow {
    nome_cognome: string;
    agente_padre?: string;
    gettone_residenziale_standard?: string | number;
    gettone_residenziale_bonus?: string | number;
    gettone_residenziale_malus?: string | number;
    rinnovo_residenziale?: string | number;
    gettone_business_standard?: string | number;
    gettone_business_bonus?: string | number;
    gettone_business_malus?: string | number;
    rinnovo_business?: string | number;
    bonus_sdd?: string | number;
    [key: string]: string | number | undefined;
}

// Bulk agent import result
export interface BulkAgentImportResult {
    success: number;
    failed: number;
    errors: Array<{ row: number; name: string; error: string }>;
}

// === PENDING ORDERS TYPES ===

export interface PendingOrder {
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

// === DASHBOARD TYPES ===

export interface DashboardContrattiTotali {
    anno_riferimento: number;
    totale_contratti_n: number;
    totale_contratti_n_1: number;
    variazione_percentuale: number;
}

export interface DashboardProvvigioniTotali {
    anno_riferimento: number;
    totale_provvigioni_n: number;
    totale_provvigioni_n_1: number;
    variazione_percentuale: number;
    valuta: string;
}

export interface DashboardMeseContratti {
    mese_nome: string;
    mese_num: number;
    anno_n: number;
    anno_n_1: number;
}

export interface DashboardContrattiMensili {
    anno_riferimento: number;
    dati: DashboardMeseContratti[];
}

export interface DashboardMeseProvvigioni {
    mese_nome: string;
    mese_num: number;
    provvigioni_n: number;
    provvigioni_n_1: number;
}

export interface DashboardProvvigioniMensili {
    anno_riferimento: number;
    unità_misura: string;
    dati: DashboardMeseProvvigioni[];
}

// Contracts by product type
export interface DashboardProdottoContratti {
    prodotto: string;
    anno_n: number;
    anno_n_1: number;
}

export interface DashboardContrattiPerProdotto {
    anno_riferimento: number;
    dati: DashboardProdottoContratti[];
}
