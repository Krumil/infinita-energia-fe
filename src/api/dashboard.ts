import type {
    DashboardTotalContracts,
    DashboardTotalCommissions,
    DashboardMonthlyContracts,
    DashboardMonthlyCommissions,
    DashboardContractsByProduct,
} from "@/types";
import { authFetch, createApiUrl, handleResponse } from "./client";

export async function getDashboardAvailableYears(): Promise<number[]> {
    const res = await authFetch(createApiUrl("/dashboard/anni-disponibili"));

    return handleResponse<number[]>(res);
}

export async function getDashboardAgentFilter(): Promise<string[]> {
    const res = await authFetch(createApiUrl("/dashboard/agenti-filtro"));

    return handleResponse<string[]>(res);
}

async function getDashboardData<T>(endpoint: string, year?: number, agent?: string): Promise<T> {
    const url = createApiUrl(`/dashboard/${endpoint}`);

    if (year) url.searchParams.set("anno", String(year));

    if (agent) url.searchParams.set("agente", agent);
    const res = await authFetch(url);

    return handleResponse<T>(res);
}

export function getDashboardTotalContracts(year?: number, agent?: string): Promise<DashboardTotalContracts> {
    return getDashboardData("contratti-totali", year, agent);
}

export function getDashboardTotalCommissions(year?: number, agent?: string): Promise<DashboardTotalCommissions> {
    return getDashboardData("provvigioni-totali", year, agent);
}

export function getDashboardMonthlyContracts(year?: number, agent?: string): Promise<DashboardMonthlyContracts> {
    return getDashboardData("contratti-mensili", year, agent);
}

export function getDashboardMonthlyCommissions(year?: number, agent?: string): Promise<DashboardMonthlyCommissions> {
    return getDashboardData("provvigioni-mensili", year, agent);
}

export function getDashboardContractsByProduct(
    year?: number,
    agent?: string,
): Promise<DashboardContractsByProduct> {
    return getDashboardData("contratti-per-prodotto", year, agent);
}
