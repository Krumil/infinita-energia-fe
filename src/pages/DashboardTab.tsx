import { useState } from "react";
import { YearFilter, ContractsHistogram, CommissionsChart, DashboardKPISection } from "@/components";
import { getDashboardData, AVAILABLE_YEARS, type AvailableYear } from "@/data/dashboardMockData";
import { useTranslation } from "@/hooks/useTranslation";

export function DashboardTab() {
    const { t } = useTranslation();
    const [selectedYear, setSelectedYear] = useState<AvailableYear>(AVAILABLE_YEARS[0]);
    const yearData = getDashboardData(selectedYear);

    return (
        <div className="space-y-8">
            {/* Dashboard Header with Welcome & Year Filter */}
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-display text-foreground">{t("dashboard")}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Panoramica delle performance e metriche principali
                    </p>
                </div>
                <YearFilter value={selectedYear} onChange={setSelectedYear} />
            </div>

            {/* KPI Cards Section */}
            <DashboardKPISection yearData={yearData} selectedYear={selectedYear} />

            {/* Charts Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-display text-foreground">Andamento Annuale</h2>
                <div className="grid gap-6 lg:grid-cols-2">
                    <ContractsHistogram data={yearData.monthlyData} selectedYear={selectedYear} />
                    <CommissionsChart data={yearData.monthlyData} selectedYear={selectedYear} />
                </div>
            </div>
        </div>
    );
}
