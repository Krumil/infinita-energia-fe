// Italian month abbreviations
export const ITALIAN_MONTHS = [
    "Gen",
    "Feb",
    "Mar",
    "Apr",
    "Mag",
    "Giu",
    "Lug",
    "Ago",
    "Set",
    "Ott",
    "Nov",
    "Dic",
] as const;

export interface MonthlyData {
    month: string;
    contracts: number;
    commissions: number;
    previousYearCommissions: number;
}

export interface YearData {
    year: number;
    totalContracts: number;
    previousYearContracts: number;
    totalCommissions: number;
    previousYearTotalCommissions: number;
    monthlyData: MonthlyData[];
}

// Pre-generated static data for consistency across renders
export const DASHBOARD_DATA: Record<number, YearData> = {
    2021: {
        year: 2021,
        totalContracts: 98,
        previousYearContracts: 86,
        totalCommissions: 78420,
        previousYearTotalCommissions: 69010,
        monthlyData: [
            { month: "Gen", contracts: 6, commissions: 5120, previousYearCommissions: 4500 },
            { month: "Feb", contracts: 7, commissions: 5680, previousYearCommissions: 5100 },
            { month: "Mar", contracts: 8, commissions: 6840, previousYearCommissions: 6200 },
            { month: "Apr", contracts: 9, commissions: 7520, previousYearCommissions: 6800 },
            { month: "Mag", contracts: 10, commissions: 8360, previousYearCommissions: 7400 },
            { month: "Giu", contracts: 9, commissions: 7680, previousYearCommissions: 6900 },
            { month: "Lug", contracts: 5, commissions: 4480, previousYearCommissions: 4000 },
            { month: "Ago", contracts: 4, commissions: 3840, previousYearCommissions: 3400 },
            { month: "Set", contracts: 9, commissions: 7200, previousYearCommissions: 6500 },
            { month: "Ott", contracts: 11, commissions: 8720, previousYearCommissions: 7800 },
            { month: "Nov", contracts: 12, commissions: 9120, previousYearCommissions: 8100 },
            { month: "Dic", contracts: 8, commissions: 3860, previousYearCommissions: 2310 },
        ],
    },
    2022: {
        year: 2022,
        totalContracts: 118,
        previousYearContracts: 98,
        totalCommissions: 94680,
        previousYearTotalCommissions: 78420,
        monthlyData: [
            { month: "Gen", contracts: 7, commissions: 6240, previousYearCommissions: 5120 },
            { month: "Feb", contracts: 8, commissions: 6880, previousYearCommissions: 5680 },
            { month: "Mar", contracts: 10, commissions: 8280, previousYearCommissions: 6840 },
            { month: "Apr", contracts: 11, commissions: 9120, previousYearCommissions: 7520 },
            { month: "Mag", contracts: 12, commissions: 10080, previousYearCommissions: 8360 },
            { month: "Giu", contracts: 11, commissions: 9280, previousYearCommissions: 7680 },
            { month: "Lug", contracts: 6, commissions: 5440, previousYearCommissions: 4480 },
            { month: "Ago", contracts: 5, commissions: 4640, previousYearCommissions: 3840 },
            { month: "Set", contracts: 11, commissions: 8720, previousYearCommissions: 7200 },
            { month: "Ott", contracts: 13, commissions: 10560, previousYearCommissions: 8720 },
            { month: "Nov", contracts: 14, commissions: 11040, previousYearCommissions: 9120 },
            { month: "Dic", contracts: 10, commissions: 4400, previousYearCommissions: 3860 },
        ],
    },
    2023: {
        year: 2023,
        totalContracts: 136,
        previousYearContracts: 118,
        totalCommissions: 112840,
        previousYearTotalCommissions: 94680,
        monthlyData: [
            { month: "Gen", contracts: 8, commissions: 7440, previousYearCommissions: 6240 },
            { month: "Feb", contracts: 10, commissions: 8200, previousYearCommissions: 6880 },
            { month: "Mar", contracts: 12, commissions: 9880, previousYearCommissions: 8280 },
            { month: "Apr", contracts: 13, commissions: 10880, previousYearCommissions: 9120 },
            { month: "Mag", contracts: 14, commissions: 12000, previousYearCommissions: 10080 },
            { month: "Giu", contracts: 12, commissions: 11040, previousYearCommissions: 9280 },
            { month: "Lug", contracts: 7, commissions: 6480, previousYearCommissions: 5440 },
            { month: "Ago", contracts: 6, commissions: 5520, previousYearCommissions: 4640 },
            { month: "Set", contracts: 13, commissions: 10400, previousYearCommissions: 8720 },
            { month: "Ott", contracts: 15, commissions: 12560, previousYearCommissions: 10560 },
            { month: "Nov", contracts: 16, commissions: 13120, previousYearCommissions: 11040 },
            { month: "Dic", contracts: 10, commissions: 5320, previousYearCommissions: 4400 },
        ],
    },
    2024: {
        year: 2024,
        totalContracts: 152,
        previousYearContracts: 136,
        totalCommissions: 131240,
        previousYearTotalCommissions: 112840,
        monthlyData: [
            { month: "Gen", contracts: 9, commissions: 8640, previousYearCommissions: 7440 },
            { month: "Feb", contracts: 11, commissions: 9520, previousYearCommissions: 8200 },
            { month: "Mar", contracts: 14, commissions: 11480, previousYearCommissions: 9880 },
            { month: "Apr", contracts: 15, commissions: 12640, previousYearCommissions: 10880 },
            { month: "Mag", contracts: 16, commissions: 13920, previousYearCommissions: 12000 },
            { month: "Giu", contracts: 14, commissions: 12800, previousYearCommissions: 11040 },
            { month: "Lug", contracts: 8, commissions: 7520, previousYearCommissions: 6480 },
            { month: "Ago", contracts: 7, commissions: 6400, previousYearCommissions: 5520 },
            { month: "Set", contracts: 14, commissions: 12080, previousYearCommissions: 10400 },
            { month: "Ott", contracts: 17, commissions: 14560, previousYearCommissions: 12560 },
            { month: "Nov", contracts: 18, commissions: 15200, previousYearCommissions: 13120 },
            { month: "Dic", contracts: 9, commissions: 6480, previousYearCommissions: 5320 },
        ],
    },
    2025: {
        year: 2025,
        totalContracts: 147,
        previousYearContracts: 152,
        totalCommissions: 126880,
        previousYearTotalCommissions: 131240,
        monthlyData: [
            { month: "Gen", contracts: 10, commissions: 9200, previousYearCommissions: 8640 },
            { month: "Feb", contracts: 12, commissions: 10120, previousYearCommissions: 9520 },
            { month: "Mar", contracts: 15, commissions: 12200, previousYearCommissions: 11480 },
            { month: "Apr", contracts: 14, commissions: 11840, previousYearCommissions: 12640 },
            { month: "Mag", contracts: 17, commissions: 14480, previousYearCommissions: 13920 },
            { month: "Giu", contracts: 15, commissions: 13440, previousYearCommissions: 12800 },
            { month: "Lug", contracts: 8, commissions: 7680, previousYearCommissions: 7520 },
            { month: "Ago", contracts: 6, commissions: 5840, previousYearCommissions: 6400 },
            { month: "Set", contracts: 14, commissions: 12320, previousYearCommissions: 12080 },
            { month: "Ott", contracts: 16, commissions: 13920, previousYearCommissions: 14560 },
            { month: "Nov", contracts: 13, commissions: 11040, previousYearCommissions: 15200 },
            { month: "Dic", contracts: 7, commissions: 4800, previousYearCommissions: 6480 },
        ],
    },
};

// Available years for the filter
export const AVAILABLE_YEARS = [2025, 2024, 2023, 2022, 2021] as const;
export type AvailableYear = (typeof AVAILABLE_YEARS)[number];

// Helper function to get data for a specific year
export function getDashboardData(year: AvailableYear): YearData {
    return DASHBOARD_DATA[year];
}

// Helper function to calculate YoY percentage change
export function calculateYoYChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
}

// Format currency for display
export function formatCurrency(amount: number, currency: string = "EUR"): string {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(amount);
}
