import type { ReactElement, ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import { monthLimits } from "@/hooks/useDashboard";
import type { DashboardPeriodFilters } from "@/api/dashboard";
import { fillTemplate, monthName } from "@/lib/dashboardFormat";

const ALL_AGENTS = "__all__";

const AUTO_MONTH = "auto";

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

const MIN_CONTRACT_OPTIONS = [1, 5, 10, 25, 50];

interface FilterFieldProps {
    id: string;
    label: string;
    children: ReactNode;
}

/** Each value names itself, like the Inviti filters, so the label is for screen readers only. */
function FilterField({ id, label, children }: FilterFieldProps): ReactElement {
    return (
        <div className="flex items-center">
            <Label htmlFor={id} className="sr-only">
                {label}
            </Label>
            {children}
        </div>
    );
}

// Same compact bordered trigger as the Inviti filter strip, sized to its value.
const FILTER_TRIGGER = "h-8 w-auto gap-2 text-xs";

function Divider(): ReactElement {
    return <div aria-hidden className="hidden h-4 w-px bg-border/50 sm:block" />;
}

interface DashboardFiltersProps {
    years: number[];
    agents: string[];
    filters: DashboardPeriodFilters;
    minContracts: number;
    /** ISO end date of the loaded period, which names the month the backend picked for "auto". */
    periodEnd: string | null;
    onYearChange: (year: number) => void;
    onAgentChange: (agent: string | null) => void;
    onMonthFromChange: (month: number) => void;
    onMonthToChange: (month: number | null) => void;
    onMinContractsChange: (minContracts: number) => void;
}

export function DashboardFilters({
    years,
    agents,
    filters,
    minContracts,
    periodEnd,
    onYearChange,
    onAgentChange,
    onMonthFromChange,
    onMonthToChange,
    onMinContractsChange,
}: DashboardFiltersProps): ReactElement {
    const { t, language } = useTranslation();
    // Months that haven't started have no data, and a start past the end is a range the backend rejects.
    const { lastMonth, lastAutoMonth } = monthLimits(filters.year);
    const lastStartMonth = filters.monthTo === null ? lastAutoMonth : lastMonth;

    let monthToLabel = t("dashboardMonthAuto");

    if (filters.monthTo !== null) {
        monthToLabel = monthName(filters.monthTo, language);
    } else if (periodEnd) {
        monthToLabel = monthName(Number(periodEnd.split("-")[1]), language);
    }

    const exportedValues = [
        { label: t("agent"), value: filters.agent ?? t("dashboardAllAgents") },
        { label: t("dashboardYear"), value: String(filters.year) },
        { label: t("dashboardMonthFrom"), value: monthName(filters.monthFrom, language) },
        { label: t("dashboardMonthTo"), value: monthToLabel },
        {
            label: t("dashboardMinContracts"),
            value: fillTemplate(t("dashboardMinContractsOption"), { count: minContracts }),
        },
    ];

    return (
        <>
            <div
                className="flex flex-wrap items-center gap-2 sm:gap-3"
                data-export-exclude
            >
                <FilterField id="dashboard-agent" label={t("agent")}>
                    <Select
                        value={filters.agent ?? ALL_AGENTS}
                        onValueChange={(value) => onAgentChange(value === ALL_AGENTS ? null : value)}
                    >
                        <SelectTrigger id="dashboard-agent" className={FILTER_TRIGGER}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_AGENTS}>{t("dashboardAllAgents")}</SelectItem>
                            {agents.map((agent) => (
                                <SelectItem key={agent} value={agent}>
                                    {agent}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FilterField>
                <Divider />
                <FilterField id="dashboard-year" label={t("dashboardYear")}>
                    <Select value={String(filters.year)} onValueChange={(value) => onYearChange(Number(value))}>
                        <SelectTrigger id="dashboard-year" className={FILTER_TRIGGER}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((year) => (
                                <SelectItem key={year} value={String(year)}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FilterField>
                <Divider />
                <div className="flex items-center gap-1.5">
                    <FilterField id="dashboard-month-from" label={t("dashboardMonthFrom")}>
                        <Select
                            value={String(filters.monthFrom)}
                            onValueChange={(value) => onMonthFromChange(Number(value))}
                        >
                            <SelectTrigger id="dashboard-month-from" className={FILTER_TRIGGER}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTHS.map((month) => (
                                    <SelectItem key={month} value={String(month)} disabled={month > lastStartMonth}>
                                        {monthName(month, language)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FilterField>
                    <span aria-hidden className="text-xs text-muted-foreground">
                        &ndash;
                    </span>
                    <FilterField id="dashboard-month-to" label={t("dashboardMonthTo")}>
                        <Select
                            value={filters.monthTo === null ? AUTO_MONTH : String(filters.monthTo)}
                            onValueChange={(value) => onMonthToChange(value === AUTO_MONTH ? null : Number(value))}
                        >
                            <SelectTrigger id="dashboard-month-to" className={FILTER_TRIGGER}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={AUTO_MONTH}>{t("dashboardMonthAuto")}</SelectItem>
                                {MONTHS.map((month) => (
                                    <SelectItem
                                        key={month}
                                        value={String(month)}
                                        disabled={month < filters.monthFrom || month > lastMonth}
                                    >
                                        {monthName(month, language)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FilterField>
                </div>
                <Divider />
                <FilterField id="dashboard-min-contracts" label={t("dashboardMinContracts")}>
                    <Select value={String(minContracts)} onValueChange={(value) => onMinContractsChange(Number(value))}>
                        <SelectTrigger id="dashboard-min-contracts" className={FILTER_TRIGGER}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MIN_CONTRACT_OPTIONS.map((count) => (
                                <SelectItem key={count} value={String(count)}>
                                    {fillTemplate(t("dashboardMinContractsOption"), { count })}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FilterField>
            </div>
            {/* A static file can't run the selects, so the export shows their values as text instead.
                The hidden attribute sits on a wrapper because Tailwind's .flex would override it. */}
            <div hidden data-export-only>
                <dl className="flex flex-wrap gap-x-8 gap-y-3">
                    {exportedValues.map(({ label, value }) => (
                        <div key={label} className="space-y-1">
                            <dt className="text-sm text-muted-foreground">{label}</dt>
                            <dd className="text-sm font-medium text-foreground">{value}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </>
    );
}
