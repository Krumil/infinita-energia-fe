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
    return text.replace(/:\s*NaN\b/g, ": null").replace(/:\s*Infinity\b/g, ": null").replace(/:\s*-Infinity\b/g, ": null");
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
export async function parseLiquidazioniExcel(file: File): Promise<Liquidazione[]> {
    const rawData = await parseExcelFile<Record<string, string | number>>(file);

    return rawData.map((row) => {
        // Map columns (handle both original and normalized names)
        const liquidazione: Liquidazione = {};

        // Direct mappings with potential alternative names
        const mappings: Array<[keyof Liquidazione, string[]]> = [
            ["piano_provvigionale", ["piano_provvigionale", "Piano Provvigionale"]],
            ["regola", ["regola", "Regola"]],
            ["consumo", ["consumo", "Consumo"]],
            ["quantita", ["quantita", "quantità", "Quantità"]],
            ["prezzo", ["prezzo", "Prezzo"]],
            ["udm", ["udm", "UdM"]],
            ["importo_euro", ["importo_euro", "importo_€", "Importo €", "Importo Euro"]],
            ["comp_dal", ["comp_dal", "Comp. Dal", "Comp. dal"]],
            ["comp_al", ["comp_al", "Comp. Al", "Comp. al"]],
            ["scaglione_consumo", ["scaglione_consumo", "Scaglione Consumo"]],
            ["scaglione_anno", ["scaglione_anno", "Scaglione Anno"]],
            ["pod_pdr", ["pod_pdr", "podpdr", "POD/PDR", "Pod/Pdr"]],
            ["punto", ["punto", "Punto"]],
            ["inizio_forn", ["inizio_forn", "Inizio Forn."]],
            ["fine_forn", ["fine_forn", "Fine Forn."]],
            ["id_ordine", ["id_ordine", "ID Ordine"]],
            ["data_firma", ["data_firma", "Data Firma"]],
            ["data_prima_accettazione", ["data_prima_accettazione", "Data Prima Accettazione"]],
            ["cod_prodotto", ["cod_prodotto", "Cod. Prodotto"]],
            ["prodotto", ["prodotto", "Prodotto"]],
            ["tipo_cliente", ["tipo_cliente", "Tipo Cliente"]],
            ["partner_comm", ["partner_comm", "Partner Comm."]],
            ["venditore", ["venditore", "Venditore"]],
            ["fatture", ["fatture", "Fatture"]],
            ["cliente", ["cliente", "Cliente"]],
            ["cf_piva", ["cf_piva", "cfpiva", "CF/P.IVA", "C.F./P.IVA"]],
            ["indirizzo_fornitura", ["indirizzo_fornitura", "Indirizzo Fornitura"]],
            ["amministratore", ["amministratore", "Amministratore"]],
            ["metodo_di_pagamento", ["metodo_di_pagamento", "Metodo di Pagamento"]],
        ];

        for (const [key, alternatives] of mappings) {
            for (const alt of alternatives) {
                if (row[alt] !== undefined && row[alt] !== "") {
                    const value = row[alt];
                    // Handle numeric fields
                    if (
                        ["consumo", "quantita", "prezzo", "importo_euro", "scaglione_anno", "id_ordine"].includes(key)
                    ) {
                        const numValue =
                            typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
                        (liquidazione as Record<string, unknown>)[key] = isNaN(numValue) ? undefined : numValue;
                    } else {
                        (liquidazione as Record<string, unknown>)[key] = String(value);
                    }
                    break;
                }
            }
        }

        return liquidazione;
    });
}

/**
 * Validate liquidation records before import
 * Returns records with valid id_ordine and pod_pdr
 */
export function validateLiquidazioni(data: Liquidazione[]): { valid: Liquidazione[]; invalid: number } {
    const valid: Liquidazione[] = [];
    let invalid = 0;

    for (const item of data) {
        // Backend requires valid id_ordine (integer) and pod_pdr
        const hasIdOrdine = item.id_ordine !== undefined && !isNaN(Number(item.id_ordine));
        const hasPodPdr = item.pod_pdr !== undefined && item.pod_pdr.trim() !== "";

        if (hasIdOrdine && hasPodPdr) {
            valid.push(item);
        } else {
            invalid++;
        }
    }

    return { valid, invalid };
}
