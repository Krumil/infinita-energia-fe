import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
    return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(amount);
}
