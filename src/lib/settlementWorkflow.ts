import { settlementsEn } from "@/translations/settlements";
import { ApiError } from "@/api/client";
import { monthToImportCompetence, monthToStartDate } from "@/lib/competenceDates";
import type { DeleteSettlementsResponse, ImportSettlementsResponse, Settlement } from "@/types";

export interface SettlementImportResult {
    success: boolean;
    message: string;
    count: number;
    skipped: number;
    hasNewRules: boolean;
}

interface SettlementWorkflowStateBase {
    preparedMonth: string | null;
    cleared: boolean;
    deletedCount: number | null;
}

export interface SettlementWorkflowIdleState extends SettlementWorkflowStateBase {
    status: "idle";
}

export interface SettlementWorkflowConflictState extends SettlementWorkflowStateBase {
    status: "conflict";
    message: string;
}

export interface SettlementWorkflowErrorState extends SettlementWorkflowStateBase {
    status: "error";
    message: string;
}

export interface SettlementWorkflowSuccessState extends SettlementWorkflowStateBase {
    status: "success";
}

export type SettlementWorkflowState =
    | SettlementWorkflowIdleState
    | SettlementWorkflowConflictState
    | SettlementWorkflowErrorState
    | SettlementWorkflowSuccessState;

export interface SettlementWorkflowDependencies {
    parseSettlementsExcel: (file: File) => Promise<Settlement[]>;
    importSettlements: (rows: Settlement[]) => Promise<ImportSettlementsResponse>;
    deleteSettlements: (month: string) => Promise<DeleteSettlementsResponse>;
    onSourceChanged: (month: string) => void | Promise<void>;
    onImported: (hasNewRules: boolean) => void | Promise<void>;
    getMessage?: (key: keyof typeof settlementsEn) => string;
    onStateChanged?: (state: SettlementWorkflowState) => void;
}

export type SettlementWorkflowCallbacks = Pick<SettlementWorkflowDependencies, "onSourceChanged" | "onImported" | "getMessage">;

export interface SettlementWorkflowController {
    updateCallbacks(callbacks: SettlementWorkflowCallbacks): void;
    readonly importing: boolean;
    readonly result: SettlementImportResult | null;
    readonly state: SettlementWorkflowState;
    readonly preparedFileName: string | null;
    handleUpload(files: File[], referencePeriod: string): Promise<SettlementImportResult | null>;
    retryImport(): Promise<SettlementImportResult | null>;
    confirmDeletion(month: string, replace: boolean): Promise<SettlementImportResult | null>;
    resetAttempt(): void;
}

interface PreparedUpload {
    fileName: string;
    month: string;
    rows: Settlement[];
    skipped: number;
}

function emptyState(): SettlementWorkflowIdleState {
    return { status: "idle", preparedMonth: null, cleared: false, deletedCount: null };
}

function extractNewRulesCount(message: string): number {
    const match = message.match(/Aggiunte\s+(\d+)\s+nuove regole/i);

    return match ? Number(match[1]) : 0;
}

function prepareRows(rows: Settlement[], month: string): Settlement[] {
    const monthStart = monthToStartDate(month);
    const [year, monthNumber] = monthStart.slice(0, 7).split("-").map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    const monthEnd = `${monthStart.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
    const competence = monthToImportCompetence(month);

    return rows.map((row) => ({
        ...row,
        competenza_liquidazione: competence,
        comp_dal: monthStart,
        comp_al: monthEnd,
    }));
}

function safelyNotify(callbackName: string, callback: () => void | Promise<void>): void {
    try {
        void Promise.resolve(callback()).catch((error) => {
            console.error("Settlement workflow callback failed", { callbackName, error });
        });
    } catch (error) {
        console.error("Settlement workflow callback failed", { callbackName, error });
    }
}

export function createSettlementWorkflow(dependencies: SettlementWorkflowDependencies): SettlementWorkflowController {
    let callbacks: SettlementWorkflowCallbacks = dependencies;
    const getMessage = (key: keyof typeof settlementsEn): string => callbacks.getMessage?.(key) ?? settlementsEn[key];
    let importing = false;
    let result: SettlementImportResult | null = null;
    let state: SettlementWorkflowState = emptyState();
    let preparedUpload: PreparedUpload | null = null;
    let cleared = false;
    let deletedCount: number | null = null;

    const publish = (nextState: SettlementWorkflowState): void => {
        state = nextState;
        dependencies.onStateChanged?.(state);
    };

    const setBusy = (nextImporting: boolean): void => {
        importing = nextImporting;
        dependencies.onStateChanged?.(state);
    };

    const currentPreparedMonth = (): string | null => preparedUpload?.month ?? null;

    const setError = (message: string): void => {
        publish({ status: "error", message, preparedMonth: currentPreparedMonth(), cleared, deletedCount });
    };

    const importPrepared = async (): Promise<SettlementImportResult | null> => {
        if (!preparedUpload) {
            setError(getMessage("settlementNoPreparedImport"));

            return null;
        }

        try {
            const importResponse = await dependencies.importSettlements(preparedUpload.rows);

            if (!importResponse.success) {
                setError(importResponse.error || importResponse.message);

                return null;
            }

            const hasNewRules = extractNewRulesCount(importResponse.message) > 0;

            const importResult: SettlementImportResult = {
                success: true,
                message: importResponse.message,
                count: preparedUpload.rows.length,
                skipped: preparedUpload.skipped,
                hasNewRules,
            };

            const importedMonth = preparedUpload.month;

            result = importResult;
            cleared = false;
            publish({ status: "success", preparedMonth: importedMonth, cleared, deletedCount });
            safelyNotify("onSourceChanged", () => callbacks.onSourceChanged(importedMonth));
            safelyNotify("onImported", () => callbacks.onImported(hasNewRules));

            return importResult;
        } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
                publish({
                    status: "conflict",
                    message: getMessage("settlementAlreadyImported"),
                    preparedMonth: preparedUpload.month,
                    cleared,
                    deletedCount,
                });
            } else {
                setError(error instanceof Error ? error.message : getMessage("settlementImportFailed"));
            }

            return null;
        }
    };

    const handleUpload = async (files: File[], referencePeriod: string): Promise<SettlementImportResult | null> => {
        if (importing) return null;

        const file = files[0];

        if (!file) {
            result = null;
            setError(getMessage("settlementSelectFile"));

            return null;
        }

        if (!referencePeriod) {
            result = null;
            setError(getMessage("settlementSelectMonth"));

            return null;
        }

        importing = true;
        result = null;
        preparedUpload = null;
        cleared = false;
        deletedCount = null;
        publish(emptyState());

        try {
            const parsedRows = await dependencies.parseSettlementsExcel(file);

            if (parsedRows.length === 0) {
                setError(getMessage("settlementNoRows"));

                return null;
            }

            // The backend skips rows without an order id, so only the rows it will insert are sent and counted.
            const importableRows = parsedRows.filter((row) => row.id_ordine !== undefined && Number.isFinite(row.id_ordine));

            if (importableRows.length === 0) {
                setError(getMessage("settlementNoOrderIds"));

                return null;
            }

            preparedUpload = {
                fileName: file.name,
                month: referencePeriod,
                rows: prepareRows(importableRows, referencePeriod),
                skipped: parsedRows.length - importableRows.length,
            };

            return await importPrepared();
        } catch (error) {
            setError(error instanceof Error ? error.message : getMessage("settlementImportFailed"));

            return null;
        } finally {
            setBusy(false);
        }
    };

    const retryImport = async (): Promise<SettlementImportResult | null> => {
        if (importing || state.status === "conflict") return null;

        result = null;
        setBusy(true);

        try {
            return await importPrepared();
        } finally {
            setBusy(false);
        }
    };

    const confirmDeletion = async (month: string, replace: boolean): Promise<SettlementImportResult | null> => {
        if (importing) return null;

        if (!month) {
            setError(getMessage("settlementSelectMonth"));

            return null;
        }

        if (replace && (state.status !== "conflict" || preparedUpload?.month !== month)) {
            return null;
        }

        result = null;

        if (!replace) {
            preparedUpload = null;
            cleared = false;
            deletedCount = null;
            publish(emptyState());
        }

        setBusy(true);

        try {
            const deletion = await dependencies.deleteSettlements(month);

            if (!deletion.success) {
                if (replace && preparedUpload) {
                    publish({ status: "conflict", message: getMessage("settlementDeleteFailed"), preparedMonth: preparedUpload.month, cleared, deletedCount });
                } else {
                    setError(getMessage("settlementDeleteFailed"));
                }

                return null;
            }

            cleared = true;
            deletedCount = deletion.righe_eliminate;
            safelyNotify("onSourceChanged", () => callbacks.onSourceChanged(month));

            if (!replace) {
                publish({ status: "success", preparedMonth: currentPreparedMonth(), cleared, deletedCount });

                return null;
            }

            return await importPrepared();
        } catch (error) {
            if (replace && preparedUpload) {
                publish({
                    status: "conflict",
                    message: error instanceof Error ? error.message : getMessage("settlementDeleteFailed"),
                    preparedMonth: preparedUpload.month,
                    cleared,
                    deletedCount,
                });
            } else {
                setError(error instanceof Error ? error.message : getMessage("settlementDeleteFailed"));
            }

            return null;
        } finally {
            setBusy(false);
        }
    };

    const resetAttempt = (): void => {
        if (importing) return;

        result = null;
        preparedUpload = null;
        cleared = false;
        deletedCount = null;
        publish(emptyState());
    };

    return {
        updateCallbacks(nextCallbacks): void {
            callbacks = nextCallbacks;
        },
        get importing(): boolean {
            return importing;
        },
        get result(): SettlementImportResult | null {
            return result;
        },
        get state(): SettlementWorkflowState {
            return state;
        },
        get preparedFileName(): string | null {
            return preparedUpload?.fileName ?? null;
        },
        handleUpload,
        retryImport,
        confirmDeletion,
        resetAttempt,
    };
}
