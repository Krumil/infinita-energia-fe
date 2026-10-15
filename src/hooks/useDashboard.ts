import { useState, useEffect } from "react";
import {
    getDashboardAvailableYears,
    getDashboardAgentFilter,
    getDashboardSalesSummary,
    getDashboardMonthlySales,
    getDashboardAgentComparison,
    getDashboardPreviousSellers,
    getDashboardProductsByAgent,
    getDashboardRevenue,
    type DashboardPeriodFilters,
} from "@/api/dashboard";
import { ApiError } from "@/api/client";
import type {
    DashboardSalesSummary,
    DashboardMonthlySales,
    DashboardAgentComparison,
    DashboardPreviousSellers,
    DashboardProductsByAgent,
    DashboardRevenue,
} from "@/types";

export type DashboardSection<T> =
    | { status: "ready"; data: T }
    | { status: "empty"; message: string }
    /** message is null when the failure isn't an API error, so the UI shows its generic text. */
    | { status: "error"; message: string | null };

export interface DashboardData {
    summary: DashboardSection<DashboardSalesSummary>;
    monthlySales: DashboardSection<DashboardMonthlySales>;
    agents: DashboardSection<DashboardAgentComparison>;
    previousSellers: DashboardSection<DashboardPreviousSellers>;
    productsByAgent: DashboardSection<DashboardProductsByAgent>;
    revenue: DashboardSection<DashboardRevenue>;
}

interface DashboardOptions {
    years: number[];
    agents: string[];
}

export interface UseDashboardResult {
    years: number[];
    agents: string[];
    optionsLoading: boolean;
    /** Set when the year and agent lists fail to load; message is null for non-API failures. */
    optionsError: { message: string | null } | null;
    filters: DashboardPeriodFilters | null;
    minContracts: number;
    data: DashboardData | null;
    loading: boolean;
    /** The agent comparison reloads on its own when only the minimum contracts change. */
    agentsLoading: boolean;
    setYear: (year: number) => void;
    setAgent: (agent: string | null) => void;
    setMonthFrom: (month: number) => void;
    setMonthTo: (month: number | null) => void;
    setMinContracts: (minContracts: number) => void;
}

// Sizes match the reference analysis report (top 15 competitors, top 10 products split over 12 agents).
const PREVIOUS_SELLERS_SHOWN = 15;

const PRODUCTS_SHOWN = 10;

// Twelve named agents plus "Altri agenti", matching the twelve-color series palette.
const AGENTS_PER_PRODUCT = 12;

interface MonthLimits {
    /** The last month either picker offers: the current month this year, December for past years. */
    lastMonth: number;
    /** The backend's "A: Automatico" end, so the latest start that end allows. */
    lastAutoMonth: number;
}

export function monthLimits(year: number): MonthLimits {
    const today = new Date();

    if (year !== today.getFullYear()) return { lastMonth: 12, lastAutoMonth: 12 };

    // The automatic end is the last complete month, except in January, where the backend ends at January itself.
    return { lastMonth: today.getMonth() + 1, lastAutoMonth: Math.max(1, today.getMonth()) };
}

/**
 * Applies a filter change and keeps the range one the backend accepts: a later start pushes an explicit end
 * up with it, and a start past the end (a year switch, or choosing the automatic end) moves back to fit.
 */
function applyFilters(prev: DashboardPeriodFilters, patch: Partial<DashboardPeriodFilters>): DashboardPeriodFilters {
    const next = { ...prev, ...patch };
    const { lastMonth, lastAutoMonth } = monthLimits(next.year);
    const monthTo = next.monthTo === null ? null : Math.min(Math.max(next.monthTo, next.monthFrom), lastMonth);

    return { ...next, monthTo, monthFrom: Math.min(next.monthFrom, monthTo ?? lastAutoMonth) };
}

function toSection<T>(name: string, result: PromiseSettledResult<T>): DashboardSection<T> {
    if (result.status === "fulfilled") return { status: "ready", data: result.value };

    if (result.reason instanceof ApiError) return { status: "error", message: result.reason.message };

    console.error(`Dashboard request "${name}" failed`, result.reason);

    return { status: "error", message: null };
}

type PeriodSections = Omit<DashboardData, "agents">;

async function fetchPeriodSections(filters: DashboardPeriodFilters): Promise<PeriodSections> {
    const [summary, monthlySales, previousSellers, productsByAgent, revenue] = await Promise.allSettled([
        getDashboardSalesSummary(filters),
        getDashboardMonthlySales(filters),
        getDashboardPreviousSellers(filters, PREVIOUS_SELLERS_SHOWN),
        getDashboardProductsByAgent(filters, PRODUCTS_SHOWN, AGENTS_PER_PRODUCT),
        getDashboardRevenue(filters),
    ]);

    // The backend answers 404 when no imported settlements cover the period yet, which is an empty state.
    const revenueSection: DashboardSection<DashboardRevenue> =
        revenue.status === "rejected" && revenue.reason instanceof ApiError && revenue.reason.status === 404
            ? { status: "empty", message: revenue.reason.message }
            : toSection("fatturato", revenue);

    return {
        summary: toSection("vendite/sintesi", summary),
        monthlySales: toSection("vendite/andamento-mensile", monthlySales),
        previousSellers: toSection("vendite/venditori-precedenti", previousSellers),
        productsByAgent: toSection("vendite/prodotti-agenti", productsByAgent),
        revenue: revenueSection,
    };
}

export function useDashboard(): UseDashboardResult {
    const [options, setOptions] = useState<DashboardOptions | null>(null);
    const [optionsError, setOptionsError] = useState<{ message: string | null } | null>(null);
    const [filters, setFilters] = useState<DashboardPeriodFilters | null>(null);
    const [minContracts, setMinContracts] = useState(10);
    const [sections, setSections] = useState<{ key: string; data: PeriodSections } | null>(null);

    const [agents, setAgents] = useState<{ key: string; section: DashboardSection<DashboardAgentComparison> } | null>(
        null,
    );

    const sectionsKey = filters ? JSON.stringify(filters) : null;
    const agentsKey = filters ? JSON.stringify([filters, minContracts]) : null;
    const loading = sectionsKey !== null && sections?.key !== sectionsKey;
    const agentsLoading = agentsKey !== null && agents?.key !== agentsKey;

    useEffect(() => {
        let isMounted = true;

        Promise.all([getDashboardAvailableYears(), getDashboardAgentFilter()])
            .then(([years, agents]) => {
                if (!isMounted) return;
                setOptions({ years, agents });

                if (years.length > 0) {
                    setFilters({ year: years[0], monthFrom: 1, monthTo: null, agent: null });
                }
            })
            .catch((cause: unknown) => {
                if (!isMounted) return;

                if (cause instanceof ApiError) {
                    setOptionsError({ message: cause.message });
                } else {
                    console.error("Dashboard filter options failed to load", cause);
                    setOptionsError({ message: null });
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!filters) return;

        const key = JSON.stringify(filters);
        let isMounted = true;

        void fetchPeriodSections(filters).then((data) => {
            if (isMounted) setSections({ key, data });
        });

        return () => {
            isMounted = false;
        };
    }, [filters]);

    useEffect(() => {
        if (!filters) return;

        const key = JSON.stringify([filters, minContracts]);
        let isMounted = true;

        void Promise.allSettled([getDashboardAgentComparison(filters, minContracts)]).then(([result]) => {
            if (isMounted) setAgents({ key, section: toSection("vendite/agenti", result) });
        });

        return () => {
            isMounted = false;
        };
    }, [filters, minContracts]);

    function updateFilters(patch: Partial<DashboardPeriodFilters>): void {
        setFilters((prev) => (prev ? applyFilters(prev, patch) : prev));
    }

    return {
        years: options?.years ?? [],
        agents: options?.agents ?? [],
        optionsLoading: options === null && optionsError === null,
        optionsError,
        filters,
        minContracts,
        // Keeps the previous result on screen while a new one loads, so charts dim instead of jumping.
        data: sections && agents ? { ...sections.data, agents: agents.section } : null,
        loading,
        agentsLoading,
        setYear: (year: number) => updateFilters({ year }),
        setAgent: (agent: string | null) => updateFilters({ agent }),
        setMonthFrom: (monthFrom: number) => updateFilters({ monthFrom }),
        setMonthTo: (monthTo: number | null) => updateFilters({ monthTo }),
        setMinContracts,
    };
}
