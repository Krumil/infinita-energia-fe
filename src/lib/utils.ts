import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null, currency: string = "EUR"): string {
    if (amount === null || amount === undefined) return "€ 0,00";
    return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(amount);
}
