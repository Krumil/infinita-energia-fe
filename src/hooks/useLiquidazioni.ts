import { useState } from "react";
import { ApiError } from "@/api/client";
import { deleteSettlements, importSettlements } from "@/api/liquidazioni";
import { useTranslation } from "@/hooks/useTranslation";
import { parseSettlementsExcel } from "@/importers/liquidazioni";
import { monthToEndDate, monthToImportCompetence, monthToStartDate } from "@/lib/competenceDates";
import type { ImportSettlementsResponse, Settlement } from "@/types";

export interface UseSettlementsOptions {
    onSourceChanged: (month: string) => void;
    onImported: (hasNewRules: boolean) => void;
}

export interface SettlementImportResult {
    message: string;
    count: number;
    skipped: number;
}

interface SettlementProgress {
    cleared: boolean;
    deletedCount: number | null;
}

interface SettlementIdleState extends SettlementProgress {
    status: "idle" | "success";
}

interface SettlementFailedState extends SettlementProgress {
    status: "conflict" | "error";
    message: string;
}

export type SettlementState = SettlementIdleState | SettlementFailedState;

interface PreparedUpload {
    fileName: string;
    month: string;
    rows: Settlement[];
    skipped: number;
}

export interface UseSettlementsResult {
    importing: boolean;
    result: SettlementImportResult | null;
    state: SettlementState;
    preparedMonth: string | null;
    preparedFileName: string | null;
    handleUpload: (file: File, month: string) => Promise<void>;
    retryImport: () => Promise<void>;
    confirmDeletion: (month: string, replace: boolean) => Promise<void>;
    resetAttempt: () => void;
}

const noProgress: SettlementProgress = { cleared: false, deletedCount: null };

function hasNewRules(message: string): boolean {
    const match = message.match(/Aggiunte\s+(\d+)\s+nuove regole/i);

    return match !== null && Number(match[1]) > 0;
}

function prepareRows(rows: Settlement[], month: string): Settlement[] {
    const competence = monthToImportCompetence(month);
    const start = monthToStartDate(month);
    const end = monthToEndDate(month);

    return rows.map((row) => ({ ...row, competenza_liquidazione: competence, comp_dal: start, comp_al: end }));
}

export function useSettlements({ onSourceChanged, onImported }: UseSettlementsOptions): UseSettlementsResult {
    const { t } = useTranslation();
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<SettlementImportResult | null>(null);
    const [state, setState] = useState<SettlementState>({ status: "idle", ...noProgress });
    const [prepared, setPrepared] = useState<PreparedUpload | null>(null);

    // Takes the upload and progress as arguments because state read after an await belongs to an older render.
    const importPrepared = async (upload: PreparedUpload, progress: SettlementProgress): Promise<void> => {
        let response: ImportSettlementsResponse;

        try {
            response = await importSettlements(upload.rows);
        } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
                setState({ status: "conflict", message: t("settlementAlreadyImported"), ...progress });
            } else {
                setState({ status: "error", message: error instanceof Error ? error.message : t("settlementImportFailed"), ...progress });
            }

            return;
        }

        if (!response.success) {
            setState({ status: "error", message: response.error || response.message, ...progress });

            return;
        }

        setResult({ message: response.message, count: upload.rows.length, skipped: upload.skipped });
        setState({ status: "success", cleared: false, deletedCount: progress.deletedCount });
        onSourceChanged(upload.month);
        onImported(hasNewRules(response.message));
    };

    const handleUpload = async (file: File, month: string): Promise<void> => {
        if (importing) return;

        setImporting(true);
        setResult(null);
        setPrepared(null);
        setState({ status: "idle", ...noProgress });

        try {
            const parsedRows = await parseSettlementsExcel(file);

            if (parsedRows.length === 0) {
                setState({ status: "error", message: t("settlementNoRows"), ...noProgress });

                return;
            }

            // The backend skips rows without an order id, so only the rows it will insert are sent and counted.
            const importableRows = parsedRows.filter((row) => row.id_ordine !== undefined && Number.isFinite(row.id_ordine));

            if (importableRows.length === 0) {
                setState({ status: "error", message: t("settlementNoOrderIds"), ...noProgress });

                return;
            }

            const upload: PreparedUpload = {
                fileName: file.name,
                month,
                rows: prepareRows(importableRows, month),
                skipped: parsedRows.length - importableRows.length,
            };

            setPrepared(upload);
            await importPrepared(upload, noProgress);
        } catch (error) {
            setState({ status: "error", message: error instanceof Error ? error.message : t("settlementImportFailed"), ...noProgress });
        } finally {
            setImporting(false);
        }
    };

    const retryImport = async (): Promise<void> => {
        if (importing || !prepared) return;

        setResult(null);
        setImporting(true);

        try {
            await importPrepared(prepared, { cleared: state.cleared, deletedCount: state.deletedCount });
        } finally {
            setImporting(false);
        }
    };

    // With replace, the month's rows are deleted and the upload that hit the conflict is imported again.
    const confirmDeletion = async (month: string, replace: boolean): Promise<void> => {
        if (importing) return;

        if (replace && (state.status !== "conflict" || prepared?.month !== month)) return;

        const upload = replace ? prepared : null;
        const before: SettlementProgress = upload ? { cleared: state.cleared, deletedCount: state.deletedCount } : noProgress;
        const fail = (message: string): void => setState({ status: upload ? "conflict" : "error", message, ...before });

        setResult(null);

        if (!upload) {
            setPrepared(null);
            setState({ status: "idle", ...noProgress });
        }

        setImporting(true);

        try {
            const deletion = await deleteSettlements(month);

            if (!deletion.success) {
                fail(t("settlementDeleteFailed"));

                return;
            }

            const progress: SettlementProgress = { cleared: true, deletedCount: deletion.righe_eliminate };

            onSourceChanged(month);

            if (upload) {
                await importPrepared(upload, progress);
            } else {
                setState({ status: "success", ...progress });
            }
        } catch (error) {
            fail(error instanceof Error ? error.message : t("settlementDeleteFailed"));
        } finally {
            setImporting(false);
        }
    };

    const resetAttempt = (): void => {
        if (importing) return;

        setResult(null);
        setPrepared(null);
        setState({ status: "idle", ...noProgress });
    };

    return {
        importing,
        result,
        state,
        preparedMonth: prepared?.month ?? null,
        preparedFileName: prepared?.fileName ?? null,
        handleUpload,
        retryImport,
        confirmDeletion,
        resetAttempt,
    };
}
