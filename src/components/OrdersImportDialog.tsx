import { useState, type ReactElement } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileDropzone } from "@/components/FileDropzone";
import { useTranslation } from "@/hooks/useTranslation";
import type { ImportExcelResponse } from "@/types";

interface OrdersImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    importing: boolean;
    progress: number;
    result: ImportExcelResponse | null;
    error: string | null;
    onUpload: (files: File[]) => void;
}

export function OrdersImportDialog({ open, onOpenChange, importing, progress, result, error, onUpload }: OrdersImportDialogProps): ReactElement {
    const { t } = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    // The hook keeps the last result across uploads, so only a result produced after this dialog's own submit is shown.
    const [submitted, setSubmitted] = useState(false);
    const [resultBeforeSubmit, setResultBeforeSubmit] = useState<ImportExcelResponse | null>(null);
    const showResult = submitted && !importing && result !== null && result !== resultBeforeSubmit;
    const covered = showResult || file !== null;
    const showError = submitted && !importing && error !== null;

    const requestClose = (): void => {
        if (importing) return;
        setFile(null);
        setSubmitted(false);
        onOpenChange(false);
    };

    const submit = (): void => {
        if (!file || importing) return;
        setResultBeforeSubmit(result);
        setSubmitted(true);
        onUpload([file]);
    };

    return (
        <Dialog open={open} onOpenChange={(next) => { if (!next) requestClose(); }}>
            <DialogContent className="sm:max-w-[480px]" closeLabel={t("close")}>
                <DialogHeader>
                    <DialogTitle className="pr-5 leading-snug">{t("importOrdersTitle")}</DialogTitle>
                    <DialogDescription>{t("importOrdersDescription")}</DialogDescription>
                </DialogHeader>

                {/* The dropzone stays mounted under the other states so the dialog keeps its height and the buttons stay put. */}
                <div className="grid items-start [&>*]:col-start-1 [&>*]:row-start-1">
                    <div className={covered ? "dropzone-compact invisible" : "dropzone-compact"} inert={covered}>
                        <FileDropzone accept=".xlsx,.xls" maxSizeMB={50} onFiles={(files) => setFile(files[0] ?? null)} disabled={importing} />
                    </div>
                    {showResult && result.details.ordini.nuovi + result.details.ordini.aggiornati === 0 ? (
                        // A file with the wrong columns still returns 200, so an import that touched no order is the only sign of it.
                        <div role="alert" className="flex items-start gap-3 rounded-md border border-amber-500/50 bg-amber-50 p-4 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <p className="text-sm">{t("ordersImportNothing")}</p>
                        </div>
                    ) : showResult ? (
                        <div role="status" className="flex items-start gap-3 rounded-md border p-4">
                            <CheckCircle className="h-5 w-5 shrink-0 text-energia-accent" />
                            <p className="text-sm">+{result.details.ordini.nuovi} {t("orders").toLowerCase()} · {result.message}</p>
                        </div>
                    ) : file ? (
                        <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                            <div className="min-w-0">
                                <p className="break-all text-sm font-medium">{file.name}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{t("fileReadyForImport")}</p>
                            </div>
                            <Button size="sm" variant="ghost" disabled={importing} onClick={() => setFile(null)}>{t("removeFile")}</Button>
                        </div>
                    ) : null}
                </div>

                {showError && (
                    <p role="alert" className="text-sm text-destructive">{t("uploadFailed")}: {error}</p>
                )}

                {importing && (
                    <div className="flex items-center gap-2" aria-live="polite">
                        <Progress value={progress} className="h-1 flex-1 bg-secondary [&>div]:bg-blue-600 [&>div]:duration-300" />
                        <span className="font-mono text-xs text-muted-foreground">{progress}%</span>
                    </div>
                )}

                <DialogFooter className="mt-2 gap-2 sm:space-x-0">
                    <Button variant="ghost" disabled={importing} onClick={requestClose}>{t("close")}</Button>
                    {!showResult && (
                        <Button disabled={!file || importing} onClick={submit}>{t("importOrders")}</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
