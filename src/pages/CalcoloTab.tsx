import { useId, useMemo, useState, type ReactElement } from "react";
import { AlertTriangle, ArrowRight, Calculator, CheckCircle2, FileSpreadsheet, Info, Loader2 } from "lucide-react";
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MonthPicker } from "@/components/DatePicker";
import { EmptyState, CalculationResults } from "@/components";
import { ConfirmationOutcome } from "@/components/ConfirmationOutcome";
import { PreviewOutline } from "@/components/PreviewOutline";
import { ZipDownloadButton } from "@/components/ZipDownloadButton";
import { useTranslation } from "@/hooks/useTranslation";
import type { ConfirmationState, LoadedPreview, PreviewState } from "@/hooks/useCalcolo";
import { summarizeDraft, type DraftActions, type DraftSummary } from "@/lib/calculationDraft";
import { buildPreviewZip } from "@/lib/calculationExport";
import { formatMonthLabel } from "@/lib/competenceDates";
import { cn, formatCurrency } from "@/lib/utils";
import type { Agent } from "@/types";

interface CalculationTabProps {
    month: string;
    preview: PreviewState;
    agents: Agent[];
    editDraft: DraftActions;
    confirmation: ConfirmationState;
    onMonthChange: (month: string) => void;
    onPreview: () => void;
    onConfirm: () => void;
    onNavigate: (tab: string) => void;
}

type DiscardTarget = { kind: "month"; month: string } | { kind: "recalculate" };

export function CalculationTab({
    month,
    preview,
    agents,
    editDraft,
    confirmation,
    onMonthChange,
    onPreview,
    onConfirm,
    onNavigate,
}: CalculationTabProps): ReactElement {
    const { t, language } = useTranslation();
    const confirmReasonId = useId();
    const [discardTarget, setDiscardTarget] = useState<DiscardTarget | null>(null);
    const loading = preview.status === "loading";
    const submitting = confirmation.status === "submitting";
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

    const emptyPreview = preview.status === "ready" && preview.data.agenti.length === 0 && preview.data.non_associati.length === 0;
    // The results show the outcome under the total card; without results it falls to the end of the page.
    const resultsShown = summary !== null && !emptyPreview;

    const outcome = confirmation.status !== "idle" && (
        <ConfirmationOutcome
            confirmation={confirmation}
            changedAfterSave={confirmation.status === "done" && dirty}
            onOpenInvites={() => onNavigate("inviti")}
        />
    );

    // Once a confirmation went through or may have, saying nothing is saved would contradict the outcome under the bar.
    const confirmNote =
        confirmation.status === "done"
            ? t("previewConfirmedNote")
            : confirmation.status === "unknown"
              ? t("previewOutcomeUnknownNote")
              : t("previewNotSaved");

    // While a recalculation loads, the bar keeps its place but stays locked, so the results under it don't move.
    // The reason doubles as the confirm button's description, so it names what blocks confirming or what saving has done so far.
    const renderConfirmBar = (shownMonth: string, shown: LoadedPreview, shownSummary: DraftSummary, confirmBlock: string | null): ReactElement => {
        const NoteIcon = submitting ? Loader2 : confirmBlock ? AlertTriangle : Info;

        return (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p
                    id={confirmReasonId}
                    className={cn(
                        "mb-0 flex items-start gap-2 text-sm",
                        confirmBlock && !submitting ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground",
                    )}
                >
                    <NoteIcon className={cn("mt-0.5 h-4 w-4 shrink-0", submitting && "animate-spin")} />
                    {confirmBlock ?? confirmNote}
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                    <ZipDownloadButton
                        label={t("exportPreviewAction")}
                        note={t("exportPreviewNote")}
                        hideNote
                        disabled={loading || shownSummary.includedAgents === 0 || shownSummary.invalidIncludedRows > 0}
                        build={() => buildPreviewZip(shownMonth, shown.draft)}
                        describeError={() => t("exportFailed")}
                    />
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="sm" className="btn-primary shrink-0" disabled={loading || confirmBlock !== null} aria-describedby={confirmReasonId}>
                                <CheckCircle2 className="h-4 w-4" />
                                {t("previewConfirmAction")}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t("confirmReviewTitle").replace("{month}", formatMonthLabel(shownMonth, language))}</AlertDialogTitle>
                                <AlertDialogDescription>{t("confirmReviewDescription")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
                                <dt className="text-muted-foreground">{t("confirmReviewIncludedAgents")}</dt>
                                <dd className="text-right font-mono">{shownSummary.includedAgents}</dd>
                                <dt className="text-muted-foreground">{t("confirmReviewIncludedRows")}</dt>
                                <dd className="text-right font-mono">{shownSummary.includedRows}</dd>
                                <dt className="font-medium">{t("confirmReviewTotal")}</dt>
                                <dd className="text-right font-mono font-medium">{formatCurrency(shownSummary.total)}</dd>
                                <dt className="text-muted-foreground">{t("confirmReviewExcludedAgents")}</dt>
                                <dd className="text-right font-mono">{shownSummary.excludedAgents}</dd>
                                <dt className="text-muted-foreground">{t("confirmReviewUnmatchedRows")}</dt>
                                <dd className="text-right font-mono">{shown.data.non_associati.length}</dd>
                            </dl>
                            <p className="text-sm text-muted-foreground">{t("confirmReviewReplaceNote")}</p>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={onConfirm}>{t("confirmReviewAction")}</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        );
    };

    const renderBody = (): ReactElement => {
        switch (preview.status) {
            case "idle":
                return <PreviewOutline month={month} loading={false} onGoToOrders={() => onNavigate("ordini")} />;

            case "loading":
                return preview.previous && summary ? (
                    <div aria-busy="true" className="pointer-events-none opacity-60 transition-opacity">
                        <CalculationResults
                            month={preview.month}
                            draft={preview.previous.draft}
                            summary={summary}
                            unmatched={preview.previous.data.non_associati}
                            agents={agents}
                            actions={renderConfirmBar(preview.month, preview.previous, summary, null)}
                            outcome={outcome}
                        />
                    </div>
                ) : (
                    <PreviewOutline month={preview.month} loading onGoToOrders={() => onNavigate("ordini")} />
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

                const confirmBlock = submitting
                    ? t("confirmSubmittingBlock")
                    : preview.stale
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
                                <Button variant="outline" size="sm" className="shrink-0" disabled={submitting} onClick={handlePreview}>
                                    {t("previewRecalculate")}
                                </Button>
                            </div>
                        )}
                        {emptyPreview ? (
                            <div className="flex flex-col items-center pb-8">
                                <EmptyState message={t("previewEmpty")} icon={<FileSpreadsheet className="h-16 w-16" />} />
                                {goToOrdersButton}
                            </div>
                        ) : (
                            summary && (
                                <CalculationResults
                                    month={preview.month}
                                    draft={preview.draft}
                                    summary={summary}
                                    unmatched={data.non_associati}
                                    agents={agents}
                                    editDraft={submitting ? undefined : editDraft}
                                    actions={renderConfirmBar(preview.month, preview, summary, confirmBlock)}
                                    outcome={outcome}
                                />
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

            <div role="group" aria-label={t("previewMonthLabel")} className="flex items-center gap-2">
                <MonthPicker
                    value={month}
                    onChange={handleMonthChange}
                    placeholder={t("selectPeriod")}
                    className="h-9 min-w-0 flex-1 sm:w-[200px] sm:flex-none"
                    disabled={submitting}
                />
                <Button size="sm" onClick={handlePreview} disabled={!month || loading || submitting} className="btn-primary h-9 shrink-0 py-0">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                    {t("previewAction")}
                </Button>
            </div>

            <p className="sr-only" aria-live="polite">
                {loading ? t("previewLoading") : ""}
            </p>

            {renderBody()}

            {!resultsShown && outcome}

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
