import { Users, Upload, Calculator, TrendingUp, Database, Receipt } from "lucide-react";
import { KPICard } from "@/components";
import { useTranslation } from "@/hooks/useTranslation";

function formatCurrency(amount: number, currency: string = "EUR"): string {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(amount);
}

interface DashboardKPIs {
    totalAgents: number;
    totalCommissions: number;
    ordersCount: number;
    liquidationsCount: number;
}

interface DashboardTabProps {
    kpis: DashboardKPIs;
    lastAction: string | null;
    onNavigate: (tab: string) => void;
}

export function DashboardTab({ kpis, lastAction, onNavigate }: DashboardTabProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-10">
            {/* KPI Grid */}
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <KPICard
                    title={t("totalAgents")}
                    value={kpis.totalAgents}
                    icon={<Users className="h-6 w-6" />}
                    description={t("activeCommissionAgents")}
                    delay={100}
                />
                <KPICard
                    title={t("totalCommissions")}
                    value={formatCurrency(kpis.totalCommissions)}
                    icon={<TrendingUp className="h-6 w-6" />}
                    description={t("currentPeriodTotal")}
                    delay={200}
                />
                <KPICard
                    title={t("ordersImported")}
                    value={kpis.ordersCount}
                    icon={<Database className="h-6 w-6" />}
                    description={t("recordsProcessed")}
                    delay={300}
                />
                <KPICard
                    title={t("liquidationsImported")}
                    value={kpis.liquidationsCount}
                    icon={<Receipt className="h-6 w-6" />}
                    description={t("recordsProcessed")}
                    delay={400}
                />
            </div>

            <div className="section-divider" />

            {/* Quick Actions & Activity */}
            <div className="grid gap-8 lg:grid-cols-5">
                <div className="lg:col-span-3 space-y-4">
                    <h2 className="font-display text-lg">{t("quickActions")}</h2>
                    <div className="space-y-3">
                        <div className="action-card" onClick={() => onNavigate("agenti")}>
                            <div className="action-card-icon">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="font-display">{t("viewAgents")}</span>
                                <p className="text-sm text-muted-foreground font-body">{t("agentsListDesc")}</p>
                            </div>
                        </div>
                        <div className="action-card" onClick={() => onNavigate("ordini")}>
                            <div className="action-card-icon">
                                <Upload className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="font-display">{t("importOrders")}</span>
                                <p className="text-sm text-muted-foreground font-body">{t("importOrdersDesc")}</p>
                            </div>
                        </div>
                        <div className="action-card" onClick={() => onNavigate("calcolo")}>
                            <div className="action-card-icon">
                                <Calculator className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="font-display">{t("calculateCommissions")}</span>
                                <p className="text-sm text-muted-foreground font-body">{t("calculateCommissionsDesc")}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <h2 className="font-display text-lg">{t("recentActivity")}</h2>
                    <div className="ledger-card p-6 min-h-[200px] flex items-center justify-center">
                        {lastAction ? (
                            <div className="flex items-center gap-4">
                                <div className="w-2 h-2 rounded-full bg-sage animate-pulse-soft" />
                                <span className="font-body">{lastAction}</span>
                            </div>
                        ) : (
                            <p className="font-display text-muted-foreground/50 italic">{t("noActivity")}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
