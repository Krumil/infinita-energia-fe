import {
    YearFilter,
    AgentFilter,
    ContractsHistogram,
    CommissionsChart,
    ProductsChart,
    DashboardKPISection,
} from "@/components";
import { useDashboard, useTranslation } from "@/hooks";
import { Loader2 } from "lucide-react";

export function DashboardTab() {
    const { t } = useTranslation();
    const { availableYears, availableAgents, selectedYear, selectedAgent, data, loading, changeYear, changeAgent } =
        useDashboard();

    // Show loading state while fetching initial data
    if (loading && !data.contrattiTotali) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Dashboard Header with Welcome & Filters */}
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-display text-foreground">{t("dashboard")}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Panoramica delle performance e metriche principali
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <AgentFilter
                        availableAgents={availableAgents}
                        value={selectedAgent}
                        onChange={changeAgent}
                        loading={loading}
                    />
                    <YearFilter
                        availableYears={availableYears}
                        value={selectedYear ?? new Date().getFullYear()}
                        onChange={changeYear}
                        loading={loading}
                    />
                </div>
            </div>

            {/* KPI Cards Section */}
            <DashboardKPISection
                contrattiTotali={data.contrattiTotali}
                provvigioniTotali={data.provvigioniTotali}
                contrattiMensili={data.contrattiMensili}
                selectedYear={selectedYear ?? new Date().getFullYear()}
                loading={loading}
            />

            {/* Charts Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-display text-foreground">Andamento Annuale</h2>
                <div className="grid gap-6 lg:grid-cols-2">
                    <ContractsHistogram
                        data={data.contrattiMensili}
                        selectedYear={selectedYear ?? new Date().getFullYear()}
                        loading={loading}
                    />
                    <CommissionsChart
                        data={data.provvigioniMensili}
                        selectedYear={selectedYear ?? new Date().getFullYear()}
                        loading={loading}
                    />
                </div>
            </div>

            {/* Products Chart Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-display text-foreground">{t("contractsByProduct")}</h2>
                <ProductsChart
                    data={data.contrattiPerProdotto}
                    selectedYear={selectedYear ?? new Date().getFullYear()}
                    loading={loading}
                />
            </div>
        </div>
    );
}
