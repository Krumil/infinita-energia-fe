import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Agent } from "@/types";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(isoDate: string | null, fallback = "—"): string {
    if (!isoDate) return fallback;
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}

export function formatCurrency(amount: number | null, currency: string = "EUR"): string {
    if (amount === null || amount === undefined) return "€ 0,00";

    // Italian skips the thousands separator below 10,000 unless grouping is forced.
    return new Intl.NumberFormat("it-IT", { style: "currency", currency, useGrouping: "always" }).format(amount);
}

// Mirrors the backend's normalize_name: uppercase words sorted alphabetically, so "Rossi Mario" matches "MARIO ROSSI".
export function normalizeName(name: string): string {
    return name.trim().toUpperCase().split(/\s+/).sort().join(" ");
}

// Orders and settlements store the seller as the backend's key, so screens and exports show the agent's typed name.
// A seller who isn't one of our agents has no typed name and stays as the key.
export function sellerNameLookup(agents: ReadonlyArray<Agent>): (seller: string) => string {
    const names = new Map(agents.map((agent) => [agent.nome_normalizzato, agent.nome_cognome]));

    return (seller) => names.get(normalizeName(seller)) ?? seller;
}

// Each query word can match anywhere, so "rossi mario" finds "MARIO ROSSI" after the backend reorders the words.
export function matchesSearch(query: string, fields: ReadonlyArray<string | null | undefined>): boolean {
    const text = fields.join(" ").toLowerCase();

    return query.toLowerCase().split(/\s+/).every((word) => text.includes(word));
}
