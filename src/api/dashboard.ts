import type {
    DashboardContrattiTotali,
    DashboardProvvigioniTotali,
    DashboardContrattiMensili,
    DashboardProvvigioniMensili,
    DashboardContrattiPerProdotto,
} from "@/types";
import { authFetch, createApiUrl, handleResponse } from "./client";

export async function getDashboardAnniDisponibili(): Promise<number[]> {
    const res = await authFetch(createApiUrl("/dashboard/anni-disponibili"));
    return handleResponse<number[]>(res);
}

export async function getDashboardAgentiFiltro(): Promise<string[]> {
    const res = await authFetch(createApiUrl("/dashboard/agenti-filtro"));
    return handleResponse<string[]>(res);
}

async function getDashboardData<T>(endpoint: string, anno?: number, agente?: string): Promise<T> {
    const url = createApiUrl(`/dashboard/${endpoint}`);
    if (anno) url.searchParams.set("anno", String(anno));
    if (agente) url.searchParams.set("agente", agente);
    const res = await authFetch(url);
    return handleResponse<T>(res);
}

export function getDashboardContrattiTotali(anno?: number, agente?: string): Promise<DashboardContrattiTotali> {
    return getDashboardData("contratti-totali", anno, agente);
}

export function getDashboardProvvigioniTotali(anno?: number, agente?: string): Promise<DashboardProvvigioniTotali> {
    return getDashboardData("provvigioni-totali", anno, agente);
}

export function getDashboardContrattiMensili(anno?: number, agente?: string): Promise<DashboardContrattiMensili> {
    return getDashboardData("contratti-mensili", anno, agente);
}

export function getDashboardProvvigioniMensili(anno?: number, agente?: string): Promise<DashboardProvvigioniMensili> {
    return getDashboardData("provvigioni-mensili", anno, agente);
}

export function getDashboardContrattiPerProdotto(
    anno?: number,
    agente?: string,
): Promise<DashboardContrattiPerProdotto> {
    return getDashboardData("contratti-per-prodotto", anno, agente);
}
