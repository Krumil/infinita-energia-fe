import { useId, useState, type ReactElement } from "react";
import { CheckCircle, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/DatePicker";
import { FileDropzone } from "@/components/FileDropzone";
import { useTranslation } from "@/hooks/useTranslation";
import type { UseSettlementsResult } from "@/hooks/useLiquidazioni";
import { currentMonth, monthToImportCompetence } from "@/lib/competenceDates";

interface SettlementsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    settlements: UseSettlementsResult;
}

interface DeletionDecision {
    month: string;
    replace: boolean;
}

export function SettlementsDialog({ open, onOpenChange, settlements }: SettlementsDialogProps): ReactElement {
    const { t, language } = useTranslation();
    const monthId = useId();
    const [month, setMonth] = useState(() => settlements.preparedMonth ?? currentMonth());
    const [file, setFile] = useState<File | null>(null);
    const [deletion, setDeletion] = useState<DeletionDecision | null>(null);
    const { importing, state, result, preparedMonth, preparedFileName } = settlements;

    const monthLabel = (value: string): string => {
        const [year, monthNumber] = value.split("-").map(Number);

        return new Date(year, monthNumber - 1, 1).toLocaleDateString(language === "it" ? "it-IT" : "en-GB", { month: "long", year: "numeric" });
    };

    const view = deletion ? "confirm" : state.status === "success" ? "result" : "edit";

    const requestClose = (): void => {
        if (importing) return;

        if (state.status === "success") {
            settlements.resetAttempt();
            setFile(null);
        }

        setDeletion(null);
        onOpenChange(false);
    };

    const changeMonth = (value: string): void => {
        settlements.resetAttempt();
        setMonth(value);
    };

    const removeFile = (): void => {
        settlements.resetAttempt();
        setFile(null);
    };

    const backToMonth = (): void => {
        settlements.resetAttempt();

        if (result) setFile(null);
    };

    const submitImport = (): void => {
        if (!file || !month || importing) return;
        void settlements.handleUpload([file], month);
    };

    const runDeletion = (): void => {
        if (!deletion || importing) return;
        void settlements.confirmDeletion(deletion.month, deletion.replace);
        setDeletion(null);
    };

    const selectedFileName = preparedFileName ?? file?.name ?? null;
    const canRetry = state.status === "error" && preparedFileName !== null;

    const fileArea = selectedFileName ? (
        <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0">
                <p className="break-all text-sm font-medium">{selectedFileName}</p>
                <p className="mt-1 text-xs text-muted-foreground">{preparedMonth ? monthToImportCompetence(preparedMonth) : t("fileReadyForImport")}</p>
            </div>
            <Button size="sm" variant="ghost" disabled={importing} onClick={removeFile}>{t("removeFile")}</Button>
        </div>
    ) : (
        <div className="dropzone-compact">
            <FileDropzone accept=".xlsx,.xls" maxSizeMB={50} onFiles={(files) => setFile(files[0] ?? null)} disabled={importing} />
        </div>
    );

    const warning = deletion ? t("deleteSettlementsWarning").split("{month}") : [];

    return (
        <Dialog open={open} onOpenChange={(next) => { if (!next) requestClose(); }}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[480px]" closeLabel={t("close")}>
                <DialogHeader>
                    <DialogTitle className="pr-5 leading-snug">
                        {deletion ? t("deleteSettlementsTitle").replace("{month}", monthLabel(deletion.month)) : t("manageSettlementsTitle")}
                    </DialogTitle>
                    <DialogDescription className={deletion ? undefined : "sr-only"}>
                        {deletion ? t("deleteSettlementsDescription") : t("manageSettlementsDescription")}
                    </DialogDescription>
                </DialogHeader>

                {view === "edit" && (
                    <div className="space-y-4">
                        <div role="group" aria-labelledby={monthId} className="space-y-2">
                            <p id={monthId} className="text-sm font-medium">{t("settlementMonthLabel")}</p>
                            <div className="flex items-center gap-2">
                                <MonthPicker value={month} onChange={changeMonth} placeholder={t("selectPeriod")} className="min-w-0 flex-1" disabled={importing} />
                                <Button
                                    variant="outline"
                                    className="shrink-0 text-muted-foreground hover:text-destructive"
                                    disabled={!month || importing}
                                    aria-label={month ? t("deleteSettlementsAria").replace("{month}", monthLabel(month)) : t("deleteSettlementsMonth")}
                                    onClick={() => setDeletion({ month, replace: false })}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    {t("deleteSettlementsAction")}
                                </Button>
                            </div>
                        </div>
                        {month && fileArea}
                        {importing && (
                            <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t("processing")}
                            </p>
                        )}
                        {!importing && state.deletedCount !== null && (
                            <p className="text-sm">{t("settlementsDeletedCount").replace("{count}", String(state.deletedCount))}</p>
                        )}
                        {!importing && state.status === "conflict" && (
                            <div role="alert" className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                                <p className="text-destructive">{state.message}</p>
                                {preparedMonth && (
                                    <Button size="sm" variant="destructive" onClick={() => setDeletion({ month: preparedMonth, replace: true })}>
                                        {t("replaceSettlements")}
                                    </Button>
                                )}
                            </div>
                        )}
                        {!importing && state.status === "error" && (
                            <div role="alert" className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                                <p className="text-destructive">{state.message}</p>
                                {state.cleared && canRetry && <p className="text-muted-foreground">{t("settlementsClearedRetry")}</p>}
                            </div>
                        )}
                    </div>
                )}

                {view === "confirm" && deletion && (
                    <div className="space-y-3 text-sm">
                        <p className="rounded-md border bg-muted/30 p-4">
                            {warning[0]}
                            <strong>{monthToImportCompetence(deletion.month)}</strong>
                            {warning[1]}
                        </p>
                        {deletion.replace && preparedFileName && (
                            <p className="text-xs text-muted-foreground">{t("replaceSettlementsNote").replace("{file}", preparedFileName)}</p>
                        )}
                    </div>
                )}

                {view === "result" && (
                    <div role="status" className="flex items-start gap-3 rounded-md border p-4">
                        <CheckCircle className="h-5 w-5 shrink-0 text-energia-accent" />
                        <div className="space-y-1 text-sm">
                            {state.deletedCount !== null && <p>{t("settlementsDeletedCount").replace("{count}", String(state.deletedCount))}</p>}
                            {result && <p>{result.count} {t("recordsProcessed").toLowerCase()} · {result.message}</p>}
                            {result && result.skipped > 0 && <p>{t("settlementSkippedRows").replace("{count}", String(result.skipped))}</p>}
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-2 gap-2 sm:space-x-0">
                    {view === "confirm" && deletion && (
                        <>
                            <Button autoFocus variant="outline" onClick={() => setDeletion(null)}>{t("cancel")}</Button>
                            <Button variant="destructive" disabled={importing} onClick={runDeletion}>
                                {deletion.replace ? t("replaceSettlements") : t("deleteSettlementsConfirm").replace("{month}", monthToImportCompetence(deletion.month))}
                            </Button>
                        </>
                    )}
                    {view === "result" && (
                        <>
                            <Button variant="outline" onClick={backToMonth}>{t("backToMonth")}</Button>
                            <Button variant="ghost" onClick={requestClose}>{t("close")}</Button>
                        </>
                    )}
                    {view === "edit" && (
                        <>
                            <Button variant="ghost" disabled={importing} onClick={requestClose}>{t("close")}</Button>
                            {canRetry ? (
                                <Button disabled={importing} onClick={() => void settlements.retryImport()}>{t("retrySettlementsImport")}</Button>
                            ) : (
                                <Button disabled={importing || !file || !month || state.status === "conflict"} onClick={submitImport}>
                                    {t("importLiquidations")}
                                </Button>
                            )}
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
