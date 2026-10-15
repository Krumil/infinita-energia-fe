import type { Language } from "@/translations";
import type { DashboardAgentRow, DashboardPeriod } from "@/types";

export const SERIES_COLORS = [
    "var(--series-1)",
    "var(--series-2)",
    "var(--series-3)",
    "var(--series-4)",
    "var(--series-5)",
    "var(--series-6)",
    "var(--series-7)",
    "var(--series-8)",
    "var(--series-9)",
    "var(--series-10)",
    "var(--series-11)",
    "var(--series-12)",
] as const;

export const MUTED_SERIES = "var(--series-muted)";

// The backend groups every agent outside the top ones under this label.
export const OTHER_AGENTS_LABEL = "Altri agenti";

export function fillTemplate(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

export function formatCount(value: number, language: Language): string {
    return value.toLocaleString(language);
}

export function formatEuro(value: number, language: Language, wholeEuros = false): string {
    const digits = wholeEuros ? 0 : 2;

    return new Intl.NumberFormat(language, {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(value);
}

export function formatPercent(value: number, language: Language, signed = false): string {
    const formatted = new Intl.NumberFormat(language, {
        maximumFractionDigits: 1,
        signDisplay: signed ? "exceptZero" : "auto",
    }).format(value);

    return `${formatted}%`;
}

/** Shares are computed here rather than by the backend, so a zero total yields 0 instead of NaN. */
export function share(part: number, total: number): number {
    return total === 0 ? 0 : (part / total) * 100;
}

export function formatPeriodDate(isoDate: string, language: Language): string {
    const [year, month, day] = isoDate.split("-").map(Number);

    // Built from parts so the date stays the calendar day the backend sent, whatever the time zone.
    return new Intl.DateTimeFormat(language, { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(year, month - 1, day),
    );
}

export function monthName(month: number, language: Language, width: "long" | "short" = "long"): string {
    const name = new Intl.DateTimeFormat(language, { month: width }).format(new Date(2000, month - 1, 1));

    return name.charAt(0).toUpperCase() + name.slice(1);
}

function periodMonths(from: string, to: string, language: Language): string {
    const first = monthName(Number(from.split("-")[1]), language, "short").replace(/\.$/, "");
    const last = monthName(Number(to.split("-")[1]), language, "short").replace(/\.$/, "");

    return first === last ? first : `${first}–${last}`;
}

/** "Gen–Ago 2026", the period as the reference report writes it in every chart title. */
export function formatPeriod(periodo: DashboardPeriod, language: Language): string {
    return `${periodMonths(periodo.dal_n, periodo.al_n, language)} ${periodo.anno_n}`;
}

/** "Gen–Ago 2026 vs 2025", for charts that compare the period with the same months a year earlier. */
export function formatPeriodComparison(periodo: DashboardPeriod, language: Language): string {
    return `${formatPeriod(periodo, language)} vs ${periodo.anno_n_1}`;
}

/** The backend upper-cases agent names; "ROSSI MARCO" reads as "Rossi Marco" in lists. */
export function displayName(name: string): string {
    return name
        .toLocaleLowerCase("it")
        .replace(/(^|[\s'’-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toLocaleUpperCase("it"));
}

/**
 * Highest SEPA share first. Agents with no contracts have no share and go last rather than counting as 0%.
 * Ties keep the order the backend sends, which is by contracts.
 */
export function bySepaShare(a: DashboardAgentRow, b: DashboardAgentRow): number {
    return (b.n.pct_sepa ?? -1) - (a.n.pct_sepa ?? -1);
}

/** Horizontal bar charts grow by a fixed height per row, so a short list doesn't stretch its bars. */
export function barChartHeight(rows: number, hasLegend: boolean): number {
    // Recharts takes the legend's height out of the plot, so it gets its own band.
    return rows * 32 + 32 + (hasLegend ? 40 : 0);
}
