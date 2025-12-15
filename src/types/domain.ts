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

// === CLIENTS ===
export interface Cliente {
    cod_fisc: string;
    tipo_cliente: string | null;
    persona: string | null;
    cognome_rag_sociale: string | null;
    nome: string | null;
    nazionalita: string | null;
    cf_straniero: string | null;
    p_iva: string | null;
    indirizzo: string | null;
    cap: string | null;
    comune: string | null;
    e_mail: string | null;
    pec: string | null;
    telefono: string | null;
    cellulare: string | null;
    codice_ateco: string | null;
}

// === PRODUCTS ===
export interface Prodotto {
    prodotto: string;
    codice_offerta_sii: string | null;
}

// === TECHNICAL DATA ===
export interface DatiTecnici {
    pod__pdr: string;
    matricola_misuratore: string | null;
    stato_punto: string | null;
    mai_partito: string | null;
    data_inizio_forn: string | null;
    data_fine_forn: string | null;
    destinaz_uso: string | null;
    classe_di_prelievo: string | null;
    mercato_di_provenienza: string | null;
    mercato_di_appartenenza: string | null;
    dest_edificio: string | null;
    invia_lettera_di_recesso: string | null;
    consumo_annuo: number | null;
    udm: string | null;
    venditore_precedente: string | null;
    tipologia_utenza: string | null;
    residente: string | null;
}

// === ORDERS ===
export interface Ordine {
    id_ordine: number;
    prodotto: string;
    cod_fisc: string;
    pod__pdr: string;
    data_firma: string | null;
    stato_firma: string | null;
    data_conferma: string | null;
    data_accettazione: string | null;
    stato: string | null;
    agenzia: string | null;
    agente: string | null;
    note: string | null;
    metodo_pagam: string | null;
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
