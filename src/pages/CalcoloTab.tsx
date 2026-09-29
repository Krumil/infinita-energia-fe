import { useId, useMemo, useState, type ReactElement } from "react";
import { AlertTriangle, ArrowRight, Calculator, CheckCircle2, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MonthPicker } from "@/components/DatePicker";
import { EmptyState, CalculationResults } from "@/components";
import { useTranslation } from "@/hooks/useTranslation";
import type { PreviewState } from "@/hooks/useCalcolo";
import { summarizeDraft, type DraftActions } from "@/lib/calculationDraft";
import type { Agent } from "@/types";

interface CalculationTabProps {
    month: string;
    preview: PreviewState;
    agents: Agent[];
    editDraft: DraftActions;
    onMonthChange: (month: string) => void;
    onPreview: () => void;
    onNavigate: (tab: string) => void;
}

type DiscardTarget = { kind: "month"; month: string } | { kind: "recalculate" };

export function CalculationTab({
    month,
    preview,
    agents,
    editDraft,
    onMonthChange,
    onPreview,
    onNavigate,
}: CalculationTabProps): ReactElement {
    const { t } = useTranslation();
    const monthLabelId = useId();
    const confirmReasonId = useId();
    const [discardTarget, setDiscardTarget] = useState<DiscardTarget | null>(null);
    const loading = preview.status === "loading";
    const dirty = preview.status === "ready" && preview.draft.dirty;

    const draft = preview.status === "ready" ? preview.draft : preview.status === "loading" ? (preview.previous?.draft ?? null) : null;
    const summary = useMemo(() => (draft ? summarizeDraft(draft) : null), [draft]);

    const handleMonthChange = (nextMonth: string): void => {
        if (nextMonth === month) return;

        if (dirty) setDiscardTarget({ kind: "month", month: nextMonth });
        else onMonthChange(nextMonth);
    };

    const handlePreview = (): void => {
        if (dirty) setDiscardTarget({ kind: "recalculate" });
        else onPreview();
    };

    const handleDiscard = (): void => {
        if (discardTarget?.kind === "month") onMonthChange(discardTarget.month);
        else if (discardTarget?.kind === "recalculate") onPreview();
        setDiscardTarget(null);
    };

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
                return preview.previous && summary ? (
                    <div aria-busy="true" className="pointer-events-none opacity-60 transition-opacity">
                        <CalculationResults
                            month={preview.month}
                            draft={preview.previous.draft}
                            summary={summary}
                            unmatched={preview.previous.data.non_associati}
                            agents={agents}
                        />
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
                        <Button variant="outline" size="sm" onClick={handlePreview}>
                            {t("retry")}
                        </Button>
                    </div>
                );

            case "ready": {
                const { data } = preview;
                const isEmpty = data.agenti.length === 0 && data.non_associati.length === 0;

                const confirmBlock = preview.stale
                    ? t("previewConfirmBlockedStale")
                    : summary && summary.includedAgents === 0
                      ? t("previewConfirmBlockedEmpty")
                      : summary && summary.invalidIncludedRows > 0
                        ? t("previewConfirmBlockedInvalid")
                        : null;

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
                                <Button variant="outline" size="sm" className="shrink-0" onClick={handlePreview}>
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
                            summary && (
                                <>
                                    <CalculationResults
                                        month={preview.month}
                                        draft={preview.draft}
                                        summary={summary}
                                        unmatched={data.non_associati}
                                        agents={agents}
                                        editDraft={editDraft}
                                    />
                                    {preview.draft.agents.length > 0 && (
                                        <div className="ledger-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                            <p id={confirmReasonId} className="text-sm text-muted-foreground">
                                                {confirmBlock ??
                                                    t("previewConfirmReady")
                                                        .replace("{agents}", String(summary.includedAgents))
                                                        .replace("{rows}", String(summary.includedRows))}
                                            </p>
                                            <Button
                                                className="btn-primary shrink-0"
                                                disabled={confirmBlock !== null}
                                                aria-describedby={confirmReasonId}
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                                {t("previewConfirmAction")}
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )
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
                            onChange={handleMonthChange}
                            placeholder={t("selectPeriod")}
                            className="min-w-0 flex-1 sm:w-[200px] sm:flex-none"
                        />
                        <Button onClick={handlePreview} disabled={!month || loading} className="btn-primary shrink-0">
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

            <AlertDialog open={discardTarget !== null} onOpenChange={(open) => !open && setDiscardTarget(null)}>
                <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("previewDiscardTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {discardTarget?.kind === "month" ? t("previewDiscardMonth") : t("previewDiscardRecalculate")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDiscard}>{t("previewDiscardConfirm")}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
