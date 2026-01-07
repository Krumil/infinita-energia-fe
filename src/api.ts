import type {
    Agente,
    CreateAgentRequest,
    AgentCreateResponse,
    AgentMessageResponse,
    ImportExcelResponse,
    ImportLiquidazioniResponse,
    Liquidazione,
    CalcoloInput,
    CalcoloResult,
    BulkAgentImportResult,
    AgentCsvRow,
    PendingOrdersResponse,
    DashboardContrattiTotali,
    DashboardProvvigioniTotali,
    DashboardContrattiMensili,
    DashboardProvvigioniMensili,
    DashboardContrattiPerProdotto,
} from "./types";

// Backend base URL - Flask runs on port 5000
const BASE_API = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

// Error class for API errors
export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = "ApiError";
    }
}

// Helper function to check response status
async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        try {
            const errorData = await res.json();
            if (errorData.error) {
                errorMessage = errorData.error;
            }
        } catch {
            // Ignore JSON parsing errors
        }
        throw new ApiError(res.status, errorMessage);
    }
    return res.json();
}

function sanitizeJson(text: string): string {
    return text
        .replace(/:\s*NaN\b/g, ": null")
        .replace(/:\s*Infinity\b/g, ": null")
        .replace(/:\s*-Infinity\b/g, ": null");
}

async function handleResponseWithSanitization<T>(res: Response): Promise<T> {
    if (!res.ok) {
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        try {
            const errorData = await res.json();
            if (errorData.error) {
                errorMessage = errorData.error;
            }
        } catch {
            // Ignore JSON parsing errors
        }
        throw new ApiError(res.status, errorMessage);
    }
    const text = await res.text();
    const sanitized = sanitizeJson(text);
    return JSON.parse(sanitized) as T;
}

// ========== AGENTS API ==========

/**
 * GET /api/agenti - List All Agents
 * Returns all sales agents with their commission configurations
 */
export async function getAgenti(): Promise<Agente[]> {
    const res = await fetch(`${BASE_API}/agenti`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return handleResponse<Agente[]>(res);
}

/**
 * POST /api/agenti - Create New Agent
 * Adds a new sales agent to the system
 * @throws ApiError with status 400 if nome_cognome is missing
 * @throws ApiError with status 409 if agent name already exists
 */
export async function createAgente(data: CreateAgentRequest): Promise<AgentCreateResponse> {
    const res = await fetch(`${BASE_API}/agenti`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });
    return handleResponse<AgentCreateResponse>(res);
}

/**
 * PUT /api/agenti/<id> - Update Agent
 * Modifies an existing agent's details (partial updates supported)
 * @throws ApiError with status 404 if agent not found
 */
export async function updateAgente(id: number, data: Partial<Agente>): Promise<AgentMessageResponse> {
    const res = await fetch(`${BASE_API}/agenti/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });
    return handleResponse<AgentMessageResponse>(res);
}

/**
 * DELETE /api/agenti/<id> - Delete Agent
 * Removes an agent from the system (IRREVERSIBLE - no cascade protection)
 * @throws ApiError with status 404 if agent not found
 */
export async function deleteAgente(id: number): Promise<AgentMessageResponse> {
    const res = await fetch(`${BASE_API}/agenti/${id}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return handleResponse<AgentMessageResponse>(res);
}

/**
 * Bulk import agents from CSV data
 * Parses CSV rows and creates agents via POST requests
 * Returns summary of successes and failures
 */
export async function bulkImportAgenti(rows: AgentCsvRow[]): Promise<BulkAgentImportResult> {
    const result: BulkAgentImportResult = {
        success: 0,
        failed: 0,
        errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.nome_cognome || row.nome_cognome.trim() === "") {
            result.failed++;
            result.errors.push({
                row: i + 1,
                name: row.nome_cognome || "(empty)",
                error: "Nome agente mancante",
            });
            continue;
        }

        const agentData: CreateAgentRequest = {
            nome_cognome: row.nome_cognome.trim(),
            agente_padre: row.agente_padre?.toString().trim() || undefined,
            gettone_residenziale_standard: parseNumericField(row.gettone_residenziale_standard),
            gettone_residenziale_bonus: parseNumericField(row.gettone_residenziale_bonus),
            gettone_residenziale_malus: parseNumericField(row.gettone_residenziale_malus),
            rinnovo_residenziale: parseNumericField(row.rinnovo_residenziale),
            gettone_business_standard: parseNumericField(row.gettone_business_standard),
            gettone_business_bonus: parseNumericField(row.gettone_business_bonus),
            gettone_business_malus: parseNumericField(row.gettone_business_malus),
            rinnovo_business: parseNumericField(row.rinnovo_business),
            bonus_sdd: parseNumericField(row.bonus_sdd),
        };

        try {
            await createAgente(agentData);
            result.success++;
        } catch (error) {
            result.failed++;
            result.errors.push({
                row: i + 1,
                name: row.nome_cognome,
                error: error instanceof Error ? error.message : "Errore sconosciuto",
            });
        }
    }

    return result;
}

function parseNumericField(value: string | number | undefined): number | undefined {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    if (typeof value === "number") {
        return isNaN(value) ? undefined : value;
    }
    const parsed = parseFloat(value.toString().replace(",", "."));
    return isNaN(parsed) ? undefined : parsed;
}

// ========== EXCEL IMPORT API ==========

/**
 * POST /api/upload-excel - Import Orders from Excel
 * Uploads Excel file to import orders, clients, products, and technical data
 * IMPORTANT: Do NOT set Content-Type header - let browser set it with boundary
 * @throws ApiError with status 400 if no file or invalid extension
 */
export async function uploadExcel(file: File): Promise<ImportExcelResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BASE_API}/upload-excel`, {
        method: "POST",
        body: formData,
        // Do NOT set Content-Type header - browser sets it automatically with boundary
    });
    return handleResponse<ImportExcelResponse>(res);
}

// ========== PENDING ORDERS API ==========

export async function getPendingOrders(): Promise<PendingOrdersResponse> {
    const res = await fetch(`${BASE_API}/ordini-non-evasi`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return handleResponse<PendingOrdersResponse>(res);
}

// ========== LIQUIDATIONS API ==========

/**
 * POST /api/importa-liquidazioni - Import Liquidation Records
 * Imports liquidation records from JSON array (parsed from Excel on frontend)
 * WARNING: INSERT ONLY - no upsert, duplicate imports create duplicate records
 * @throws ApiError with status 400/500 on error
 */
export async function importLiquidazioni(data: Liquidazione[]): Promise<ImportLiquidazioniResponse> {
    const res = await fetch(`${BASE_API}/importa-liquidazioni`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });
    return handleResponse<ImportLiquidazioniResponse>(res);
}

// ========== COMMISSION CALCULATION API ==========

/**
 * POST /api/calcolo - Calculate Commissions
 * Processes liquidation data and calculates agent commissions
 * IMPORTANT: Use original column names with spaces/special chars
 * Only processes records where Partner Comm. = "INFINITA ENERGIA INSIEME SRL"
 */
export async function calcolaProvvigioni(data: CalcoloInput[]): Promise<CalcoloResult> {
    const res = await fetch(`${BASE_API}/calcolo`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });
    return handleResponseWithSanitization<CalcoloResult>(res);
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Convert liquidation data from database format to calculation input format
 * Maps snake_case fields to the original column names expected by the backend
 */
export function convertToCalcoloInput(liquidazioni: Liquidazione[]): CalcoloInput[] {
    return liquidazioni.map((liq) => ({
        "Partner Comm.": liq.partner_comm || "",
        Regola: liq.regola || "",
        "Tipo Cliente": liq.tipo_cliente || "",
        Venditore: liq.venditore || "",
        Consumo: liq.consumo || 0,
        Quantità: liq.quantita || 0,
        "Importo €": liq.importo_euro || 0,
        "POD/PDR": liq.pod_pdr || "",
        "ID Ordine": liq.id_ordine || 0,
        "Data Firma": liq.data_firma || "",
        Prodotto: liq.prodotto || "",
        Cliente: liq.cliente || "",
        "Comp. dal": liq.comp_dal || "",
        "Comp. al": liq.comp_al || "",
        "C.F./P.IVA": liq.cf_piva || "",
    }));
}

/**
 * Parse Excel/CSV file using SheetJS
 * Returns array of objects with column headers as keys
 */
export async function parseExcelFile<T extends Record<string, unknown>>(file: File): Promise<T[]> {
    const XLSX = await import("xlsx");

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: "binary" });

                // Get first sheet
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to JSON (header row is automatically detected)
                const jsonData = XLSX.utils.sheet_to_json<T>(worksheet, {
                    defval: "", // Default value for empty cells
                    raw: false, // Return formatted strings instead of raw values
                });

                resolve(jsonData);
            } catch (error) {
                reject(new Error(`Errore parsing file: ${error instanceof Error ? error.message : "sconosciuto"}`));
            }
        };

        reader.onerror = () => {
            reject(new Error("Errore lettura file"));
        };

        reader.readAsBinaryString(file);
    });
}

/**
 * Parse liquidation Excel file with specific column mapping
 * Handles both Italian and normalized column names
 */
function parseAndFormatDate(dateStr: string | number | undefined): string | undefined {
    if (dateStr === undefined || dateStr === null || dateStr === "") {
        return undefined;
    }

    const str = String(dateStr).trim();
    if (!str) return undefined;

    // DD/MM/YYYY or D/M/YYYY
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const [, day, month, year] = slashMatch;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    // DD-MM-YYYY or D-M-YYYY
    const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dashMatch) {
        const [, day, month, year] = dashMatch;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    // YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
        const [, year, month, day] = isoMatch;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    return str;
}

export async function parseLiquidazioniExcel(file: File): Promise<Liquidazione[]> {
    const rawData = await parseExcelFile<Record<string, string | number>>(file);

    const dateFields = ["comp_dal", "comp_al", "inizio_forn", "fine_forn", "data_firma", "data_prima_accettazione"];

    return rawData.map((row) => {
        const liquidazione: Liquidazione = {};

        const rowKeysLower = new Map<string, string>();
        for (const key of Object.keys(row)) {
            rowKeysLower.set(key.toLowerCase(), key);
        }

        const findValue = (alternatives: string[]): string | number | undefined => {
            for (const alt of alternatives) {
                if (row[alt] !== undefined && row[alt] !== "") {
                    return row[alt];
                }
                const actualKey = rowKeysLower.get(alt.toLowerCase());
                if (actualKey && row[actualKey] !== undefined && row[actualKey] !== "") {
                    return row[actualKey];
                }
            }
            return undefined;
        };

        const mappings: Array<[keyof Liquidazione, string[]]> = [
            ["piano_provvigionale", ["piano_provvigionale", "Piano Provvigionale"]],
            ["regola", ["regola", "Regola"]],
            ["consumo", ["consumo", "Consumo"]],
            ["quantita", ["quantita", "quantità", "Quantità"]],
            ["prezzo", ["prezzo", "Prezzo"]],
            ["udm", ["udm", "Udm", "UdM", "UDM"]],
            ["importo_euro", ["importo_euro", "importo_€", "Importo €", "Importo Euro"]],
            ["comp_dal", ["comp_dal", "Comp. Dal", "Comp. dal"]],
            ["comp_al", ["comp_al", "Comp. Al", "Comp. al"]],
            ["scaglione_consumo", ["scaglione_consumo", "Scaglione Consumo", "Scaglione consumo"]],
            ["scaglione_anno", ["scaglione_anno", "Scaglione Anno", "Scaglione anno"]],
            ["pod_pdr", ["pod_pdr", "podpdr", "POD/PDR", "Pod/Pdr"]],
            ["punto", ["punto", "Punto"]],
            ["inizio_forn", ["inizio_forn", "Inizio Forn.", "Inizio forn."]],
            ["fine_forn", ["fine_forn", "Fine Forn.", "Fine forn."]],
            ["id_ordine", ["id_ordine", "ID Ordine", "Id Ordine", "Id ordine"]],
            ["data_firma", ["data_firma", "Data Firma", "Data firma"]],
            [
                "data_prima_accettazione",
                ["data_prima_accettazione", "Data Prima Accettazione", "Data prima accettazione"],
            ],
            ["cod_prodotto", ["cod_prodotto", "Cod. Prodotto", "Cod. prodotto"]],
            ["prodotto", ["prodotto", "Prodotto"]],
            ["tipo_cliente", ["tipo_cliente", "Tipo Cliente", "Tipo cliente"]],
            ["partner_comm", ["partner_comm", "Partner Comm.", "Partner comm."]],
            ["venditore", ["venditore", "Venditore"]],
            ["fatture", ["fatture", "Fatture"]],
            ["cliente", ["cliente", "Cliente"]],
            ["cf_piva", ["cf_piva", "cfpiva", "CF/P.IVA", "C.F./P.IVA"]],
            ["indirizzo_fornitura", ["indirizzo_fornitura", "Indirizzo Fornitura", "Indirizzo fornitura"]],
            ["amministratore", ["amministratore", "Amministratore"]],
            ["metodo_di_pagamento", ["metodo_di_pagamento", "Metodo di Pagamento", "Metodo di pagamento"]],
            [
                "competenza_liquidazione",
                ["competenza_liquidazione", "Competenza Liquidazione", "Comp. Liquidazione", "COMPETENZA"],
            ],
        ];

        for (const [key, alternatives] of mappings) {
            const value = findValue(alternatives);
            if (value !== undefined) {
                if (["consumo", "quantita", "prezzo", "importo_euro", "scaglione_anno", "id_ordine"].includes(key)) {
                    const numValue = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
                    (liquidazione as Record<string, unknown>)[key] = isNaN(numValue) ? undefined : numValue;
                } else if (key === "competenza_liquidazione") {
                    // Parse MM/YYYY format to YYYY-MM-DD
                    const str = String(value).trim();
                    const mmYYYYMatch = str.match(/^(\d{1,2})\/(\d{4})$/);
                    if (mmYYYYMatch) {
                        const [, month, year] = mmYYYYMatch;
                        (liquidazione as Record<string, unknown>)[key] = `${year}-${month.padStart(2, "0")}-01`;
                    } else {
                        // Try YYYY-MM or YYYY-MM-DD format
                        const isoMatch = str.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
                        if (isoMatch) {
                            const [, year, month, day] = isoMatch;
                            (liquidazione as Record<string, unknown>)[key] = `${year}-${month.padStart(2, "0")}-${(day || "01").padStart(2, "0")}`;
                        } else {
                            (liquidazione as Record<string, unknown>)[key] = str;
                        }
                    }
                } else if (dateFields.includes(key)) {
                    (liquidazione as Record<string, unknown>)[key] = parseAndFormatDate(value);
                } else {
                    (liquidazione as Record<string, unknown>)[key] = String(value);
                }
            }
        }

        return liquidazione;
    });
}

// ========== DASHBOARD API ==========

/** GET /api/dashboard/anni-disponibili - Get available years */
export async function getDashboardAnniDisponibili(): Promise<number[]> {
    const res = await fetch(`${BASE_API}/dashboard/anni-disponibili`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return handleResponse<number[]>(res);
}

/** GET /api/dashboard/agenti-filtro - Get agents available for filtering */
export async function getDashboardAgentiFiltro(): Promise<string[]> {
    const res = await fetch(`${BASE_API}/dashboard/agenti-filtro`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return handleResponse<string[]>(res);
}

/** GET /api/dashboard/contratti-totali - Get total contracts */
export async function getDashboardContrattiTotali(anno?: number, agente?: string): Promise<DashboardContrattiTotali> {
    const url = new URL(`${BASE_API}/dashboard/contratti-totali`);
    if (anno) url.searchParams.set("anno", String(anno));
    if (agente) url.searchParams.set("agente", agente);
    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return handleResponse<DashboardContrattiTotali>(res);
}

/** GET /api/dashboard/provvigioni-totali - Get total commissions */
export async function getDashboardProvvigioniTotali(anno?: number, agente?: string): Promise<DashboardProvvigioniTotali> {
    const url = new URL(`${BASE_API}/dashboard/provvigioni-totali`);
    if (anno) url.searchParams.set("anno", String(anno));
    if (agente) url.searchParams.set("agente", agente);
    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return handleResponse<DashboardProvvigioniTotali>(res);
}

/** GET /api/dashboard/contratti-mensili - Get monthly contracts */
export async function getDashboardContrattiMensili(anno?: number, agente?: string): Promise<DashboardContrattiMensili> {
    const url = new URL(`${BASE_API}/dashboard/contratti-mensili`);
    if (anno) url.searchParams.set("anno", String(anno));
    if (agente) url.searchParams.set("agente", agente);
    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return handleResponse<DashboardContrattiMensili>(res);
}

/** GET /api/dashboard/provvigioni-mensili - Get monthly commissions */
export async function getDashboardProvvigioniMensili(anno?: number, agente?: string): Promise<DashboardProvvigioniMensili> {
    const url = new URL(`${BASE_API}/dashboard/provvigioni-mensili`);
    if (anno) url.searchParams.set("anno", String(anno));
    if (agente) url.searchParams.set("agente", agente);
    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return handleResponse<DashboardProvvigioniMensili>(res);
}

/** GET /api/dashboard/contratti-per-prodotto - Get contracts by product type */
export async function getDashboardContrattiPerProdotto(
    anno?: number,
    agente?: string
): Promise<DashboardContrattiPerProdotto> {
    const url = new URL(`${BASE_API}/dashboard/contratti-per-prodotto`);
    if (anno) url.searchParams.set("anno", String(anno));
    if (agente) url.searchParams.set("agente", agente);
    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return handleResponse<DashboardContrattiPerProdotto>(res);
}
