import { useTranslation } from "@/hooks/useTranslation";
import { useLayoutEffect, useState } from "react";
import { deleteSettlements, importSettlements } from "@/api/liquidazioni";
import { parseSettlementsExcel } from "@/importers/liquidazioni";
import {
    createSettlementWorkflow,
    type SettlementImportResult,
    type SettlementWorkflowController,
    type SettlementWorkflowState,
} from "@/lib/settlementWorkflow";

export interface UseSettlementsOptions {
    onSourceChanged: (month: string) => void | Promise<void>;
    onImported: (hasNewRules: boolean) => void | Promise<void>;
}

export interface UseSettlementsResult {
    importing: boolean;
    result: SettlementImportResult | null;
    state: SettlementWorkflowState;
    preparedMonth: string | null;
    preparedFileName: string | null;
    handleUpload: SettlementWorkflowController["handleUpload"];
    retryImport: SettlementWorkflowController["retryImport"];
    confirmDeletion: SettlementWorkflowController["confirmDeletion"];
    resetAttempt: SettlementWorkflowController["resetAttempt"];
}

export function useSettlements(options: UseSettlementsOptions): UseSettlementsResult {
    const { t } = useTranslation();
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<SettlementImportResult | null>(null);

    const [state, setState] = useState<SettlementWorkflowState>({
        status: "idle",
        preparedMonth: null,
        cleared: false,
        deletedCount: null,
    });

    const [preparedFileName, setPreparedFileName] = useState<string | null>(null);

    const [controller] = useState(() => {
        const workflow = createSettlementWorkflow({
            getMessage: t,
            parseSettlementsExcel,
            importSettlements,
            deleteSettlements,
            onSourceChanged: options.onSourceChanged,
            onImported: options.onImported,
            onStateChanged: (nextState) => {
                setImporting(workflow.importing);
                setResult(workflow.result);
                setState(nextState);
                setPreparedFileName(workflow.preparedFileName);
            },
        });

        return workflow;
    });

    useLayoutEffect(() => {
        controller.updateCallbacks({ ...options, getMessage: t });
    }, [controller, options, t]);

    return {
        importing,
        result,
        state,
        preparedMonth: state.preparedMonth,
        preparedFileName,
        handleUpload: controller.handleUpload,
        retryImport: controller.retryImport,
        confirmDeletion: controller.confirmDeletion,
        resetAttempt: controller.resetAttempt,
    };
}
