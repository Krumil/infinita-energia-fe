export interface Regola {
    id: number;
    descrizione: string;
    utilizzato: boolean;
    valore_default: number;
    tipo_utenza: "residenziale" | "business" | null;
    tipo_servizio: "gas" | "luce" | null;
}

export interface Scaglione {
    id: number;
    descrizione: string;
    tipo_utenza: "residenziale" | "business" | null;
    tipo_servizio: "gas" | "luce" | null;
}

export interface Agente {
    id: number;
    nome_cognome: string;
    agente_padre: string | null;
    mail: string | null;
    statistiche: boolean | null;
}

export interface ConfigurazioneRegola {
    regola_id: number;
    regola_nome: string;
    tasso_id: number;
    tasso_nome: string;
    tasso_descrizione?: string;
    valore: number;
    is_custom: boolean;
}

export interface ConfigurazioneResponse {
    agente_id: number;
    nome_agente: string;
    configurazione: ConfigurazioneRegola[];
}

export interface Liquidazione {
    id?: number;
    piano_provvigionale?: string;
    regola?: string;
    consumo?: number;
    quantita?: number;
    prezzo?: number;
    udm?: string;
    importo_euro?: number;
    comp_dal?: string;
    comp_al?: string;
    scaglione_consumo?: string;
    scaglione_anno?: number;
    pod_pdr?: string;
    punto?: string;
    inizio_forn?: string;
    fine_forn?: string;
    id_ordine?: number;
    data_firma?: string;
    data_prima_accettazione?: string;
    cod_prodotto?: string;
    prodotto?: string;
    tipo_cliente?: string;
    partner_comm?: string;
    venditore?: string;
    fatture?: string;
    cliente?: string;
    cf_piva?: string;
    indirizzo_fornitura?: string;
    amministratore?: string;
    metodo_di_pagamento?: string;
    data_importazione?: string;
    competenza_liquidazione?: string; // Format: "YYYY-MM-DD" from Excel (MM/YYYY)
}

export interface StoricoInvito {
    id: number;
    agente_id: number;
    nome_agente: string;
    mese_competenza: string;
    totale_invito: number;
    stato: "bozza" | "inviato" | "approvato";
    riferimento_fattura: string | null;
    data_fattura: string | null;
    pagato: boolean;
    data_pagamento: string | null;
}

export type AppSettings = Record<string, unknown>;
