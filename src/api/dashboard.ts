import type {
    DashboardSalesSummary,
    DashboardMonthlySales,
    DashboardAgentComparison,
    DashboardPreviousSellers,
    DashboardProductsByAgent,
    DashboardRevenue,
} from "@/types";
import { authFetch, createApiUrl, handleResponse } from "./client";

export interface DashboardPeriodFilters {
    year: number;
    monthFrom: number;
    /** null lets the backend pick the last complete month, which differs between sales and revenue. */
    monthTo: number | null;
    agent: string | null;
}

export async function getDashboardAvailableYears(): Promise<number[]> {
    const res = await authFetch(createApiUrl("/dashboard/anni-disponibili"));

    return handleResponse<number[]>(res);
}

export async function getDashboardAgentFilter(): Promise<string[]> {
    const res = await authFetch(createApiUrl("/dashboard/agenti-filtro"));

    return handleResponse<string[]>(res);
}

async function getPeriodData<T>(
    endpoint: string,
    filters: DashboardPeriodFilters,
    extra: Record<string, number> = {},
): Promise<T> {
    const url = createApiUrl(`/dashboard/${endpoint}`);

    url.searchParams.set("anno", String(filters.year));
    url.searchParams.set("mese_da", String(filters.monthFrom));

    if (filters.monthTo !== null) url.searchParams.set("mese_a", String(filters.monthTo));

    if (filters.agent) url.searchParams.set("agente", filters.agent);

    for (const [key, value] of Object.entries(extra)) {
        url.searchParams.set(key, String(value));
    }

    const res = await authFetch(url);

    return handleResponse<T>(res);
}

export function getDashboardSalesSummary(filters: DashboardPeriodFilters): Promise<DashboardSalesSummary> {
    return getPeriodData("vendite/sintesi", filters);
}

export function getDashboardMonthlySales(filters: DashboardPeriodFilters): Promise<DashboardMonthlySales> {
    return getPeriodData("vendite/andamento-mensile", filters);
}

export function getDashboardAgentComparison(
    filters: DashboardPeriodFilters,
    minContracts: number,
): Promise<DashboardAgentComparison> {
    return getPeriodData("vendite/agenti", filters, { min_contratti: minContracts });
}

export function getDashboardPreviousSellers(
    filters: DashboardPeriodFilters,
    topN: number,
): Promise<DashboardPreviousSellers> {
    return getPeriodData("vendite/venditori-precedenti", filters, { top_n: topN });
}

export function getDashboardProductsByAgent(
    filters: DashboardPeriodFilters,
    topProducts: number,
    topAgents: number,
): Promise<DashboardProductsByAgent> {
    return getPeriodData("vendite/prodotti-agenti", filters, { top_prodotti: topProducts, top_agenti: topAgents });
}

export function getDashboardRevenue(filters: DashboardPeriodFilters): Promise<DashboardRevenue> {
    return getPeriodData("fatturato", filters);
}
