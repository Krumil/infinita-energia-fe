import type { Regola } from "./domain";

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

export interface UpdateRegolaRequest {
    utilizzato?: boolean;
    valore_default?: number;
    tipo_utenza?: "residenziale" | "business" | null;
    tipo_servizio?: "gas" | "luce" | null;
}

export interface UpdateRegolaResponse {
    success: boolean;
    message: string;
    regola: Regola;
}

export interface ImportRegoleResponse {
    success: boolean;
    message: string;
}

export interface UpdateScaglioneRequest {
    tipo_utenza?: "residenziale" | "business" | null;
    tipo_servizio?: "gas" | "luce" | null;
}

export interface ImportScaglioniResponse {
    success: boolean;
    message: string;
}

export interface SaveConfigurazioneRequest {
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

export interface ImportLiquidazioniResponse {
    success: boolean;
    message: string;
    error?: string;
}

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

export type CalcoloNonPagatiResponse =
    | { kind: "data"; totale_provvigione: number; dati_provvigione: ProvvigioneData[] }
    | { kind: "empty"; message: string };

export interface CalcoloInput {
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
    unita_misura: string;
    dati: DashboardMeseProvvigioni[];
}

export interface DashboardProdottoContratti {
    prodotto: string;
    anno_n: number;
    anno_n_1: number;
}

export interface DashboardContrattiPerProdotto {
    anno_riferimento: number;
    dati: DashboardProdottoContratti[];
}

export interface UpdateInvitoRequest {
    stato?: "bozza" | "inviato" | "approvato";
    riferimento_fattura?: string;
    data_fattura?: string;
    pagato?: boolean;
    data_pagamento?: string;
}

export interface CheckAgentiResponse {
    matches: string[];
    not_found: string[];
    stats: {
        total_input: number;
        matched_count: number;
        not_found_count: number;
    };
}
