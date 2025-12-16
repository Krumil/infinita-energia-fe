// === AGENTS ===
export interface Agente {
    id: number;
    nome_cognome: string;
    agente_padre: string | null;
    gettone_residenziale_standard: number | null;
    gettone_residenziale_bonus: number | null;
    gettone_residenziale_malus: number | null;
    rinnovo_residenziale: number | null;
    gettone_business_standard: number | null;
    gettone_business_bonus: number | null;
    gettone_business_malus: number | null;
    rinnovo_business: number | null;
    bonus_sdd: number | null;
}

// === LIQUIDATIONS ===
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
}

// Application settings
export interface AppSettings {
    dateFormat: string;
}
