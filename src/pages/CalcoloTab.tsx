import { useId, type ReactElement } from "react";
import { AlertTriangle, ArrowRight, Calculator, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/DatePicker";
import { EmptyState, CalculationResults } from "@/components";
import { useTranslation } from "@/hooks/useTranslation";
import type { PreviewState } from "@/hooks/useCalcolo";
import type { Agent } from "@/types";

interface CalculationTabProps {
    month: string;
    preview: PreviewState;
    agents: Agent[];
    onMonthChange: (month: string) => void;
    onPreview: () => void;
    onNavigate: (tab: string) => void;
}

export function CalculationTab({
    month,
    preview,
    agents,
    onMonthChange,
    onPreview,
    onNavigate,
}: CalculationTabProps): ReactElement {
    const { t } = useTranslation();
    const monthLabelId = useId();
    const loading = preview.status === "loading";

    const goToOrdersButton = (
        <Button variant="outline" size="sm" onClick={() => onNavigate("ordini")}>
            {t("previewGoToOrders")}
            <ArrowRight className="h-4 w-4" />
        </Button>
    );

    const renderBody = (): ReactElement => {
        switch (preview.status) {
            case "idle":
                return <EmptyState message={t("previewIdle")} icon={<Calculator className="h-16 w-16" />} />;

            case "loading":
                return preview.previous ? (
                    <div aria-busy="true" className="pointer-events-none opacity-60 transition-opacity">
                        <CalculationResults month={preview.month} preview={preview.previous} agents={agents} />
                    </div>
                ) : (
                    <div aria-busy="true" className="space-y-6">
                        <div className="kpi-card flex h-48 items-center justify-center gap-3 p-6">
                            <Loader2 className="h-6 w-6 animate-spin text-energia-accent" />
                            <span className="font-display">{t("previewLoading")}</span>
                        </div>
                        <div className="ledger-card h-72 animate-pulse bg-secondary/20" />
                    </div>
                );

            case "error":
                return preview.reason === "setup" ? (
                    <div role="alert" className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
                        <p className="font-medium">{t("previewSetupTitle")}</p>
                        <p>{t("previewSetupDescription")}</p>
                        {preview.message && <p className="text-muted-foreground">{preview.message}</p>}
                        <Button variant="outline" size="sm" onClick={() => onNavigate("regole")}>
                            {t("previewGoToRules")}
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div role="alert" className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
                        <p className="font-medium">{t("previewErrorTitle")}</p>
                        <p>{preview.message ?? t("previewErrorFallback")}</p>
                        <Button variant="outline" size="sm" onClick={onPreview}>
                            {t("retry")}
                        </Button>
                    </div>
                );

            case "ready": {
                const { data } = preview;
                const isEmpty = data.agenti.length === 0 && data.non_associati.length === 0;

                return (
                    <div className="space-y-6">
                        {preview.stale && (
                            <div
                                role="alert"
                                className="flex flex-col gap-3 rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between dark:bg-amber-950/30 dark:text-amber-300"
                            >
                                <span className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    {t("previewStale")}
                                </span>
                                <Button variant="outline" size="sm" className="shrink-0" onClick={onPreview}>
                                    {t("previewRecalculate")}
                                </Button>
                            </div>
                        )}
                        {isEmpty ? (
                            <div className="flex flex-col items-center pb-8">
                                <EmptyState message={t("previewEmpty")} icon={<FileSpreadsheet className="h-16 w-16" />} />
                                {goToOrdersButton}
                            </div>
                        ) : (
                            <CalculationResults month={preview.month} preview={data} agents={agents} />
                        )}
                    </div>
                );
            }
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-display text-2xl">{t("calculateCommissionsTitle")}</h2>
                <p className="font-body text-muted-foreground mt-1">{t("calculateCommissionsDesc")}</p>
            </div>

            <div className="ledger-card flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
                <div role="group" aria-labelledby={monthLabelId} className="space-y-2">
                    <p id={monthLabelId} className="text-sm font-medium">
                        {t("previewMonthLabel")}
                    </p>
                    <div className="flex items-center gap-2">
                        <MonthPicker
                            value={month}
                            onChange={onMonthChange}
                            placeholder={t("selectPeriod")}
                            className="min-w-0 flex-1 sm:w-[200px] sm:flex-none"
                        />
                        <Button onClick={onPreview} disabled={!month || loading} className="btn-primary shrink-0">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                            {t("previewAction")}
                        </Button>
                    </div>
                </div>
                <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                    {t("previewImportHint")}
                    <Button variant="link" size="unstyled" className="h-auto p-0" onClick={() => onNavigate("ordini")}>
                        {t("previewGoToOrders")}
                    </Button>
                </p>
            </div>

            <p className="sr-only" aria-live="polite">
                {loading ? t("previewLoading") : ""}
            </p>

            {renderBody()}
        </div>
    );
}
