import { useCallback, useMemo, useRef, useState } from "react";
import { confirmCommissions, previewCommissions } from "@/api/calcolo";
import { ApiError } from "@/api/client";
import { buildConfirmation, type ConfirmationSnapshot } from "@/lib/calculationConfirmation";
import {
    createDraft,
    removeDraftRow,
    setDraftAgentIncluded,
    setDraftRowAmount,
    summarizeDraft,
    type CalculationDraft,
    type DraftActions,
} from "@/lib/calculationDraft";
import { currentMonth } from "@/lib/competenceDates";
import type { ConfirmationResult, PreviewResponse } from "@/types";

export interface LoadedPreview {
    data: PreviewResponse;
    draft: CalculationDraft;
}

export type PreviewState =
    | { status: "idle" }
    | { status: "loading"; month: string; previous: LoadedPreview | null }
    | { status: "ready"; month: string; data: PreviewResponse; draft: CalculationDraft; stale: boolean }
    | { status: "error"; month: string; reason: "setup" | "request"; message: string | null };

// Only 400 and 404 prove nothing was written; any other failure may have lost the response to a completed save.
export type ConfirmationState =
    | { status: "idle" }
    | { status: "submitting"; snapshot: ConfirmationSnapshot }
    | { status: "done"; snapshot: ConfirmationSnapshot; results: ConfirmationResult[] }
    | { status: "rejected"; snapshot: ConfirmationSnapshot; message: string }
    | { status: "unknown"; snapshot: ConfirmationSnapshot; message: string | null };

interface PendingPreview {
    month: string;
    invalidated: boolean;
}

export interface UseCalculationResult {
    month: string;
    preview: PreviewState;
    selectMonth: (month: string) => void;
    requestPreview: () => void;
    invalidateMonth: (month: string) => void;
    editDraft: DraftActions;
    confirmation: ConfirmationState;
    confirmDraft: () => void;
}

export function useCalculation(): UseCalculationResult {
    const [month, setMonth] = useState(currentMonth);
    const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
    // Only the latest request may update the preview; month changes and newer requests replace it.
    const latestRequest = useRef<PendingPreview | null>(null);
    const [confirmation, setConfirmation] = useState<ConfirmationState>({ status: "idle" });
    // Set synchronously, so a second click or Enter before React re-renders can't start a parallel write.
    const submitting = useRef(false);

    const selectMonth = useCallback(
        (nextMonth: string): void => {
            if (nextMonth === month) return;
            latestRequest.current = null;
            setMonth(nextMonth);
            setPreview({ status: "idle" });
            setConfirmation({ status: "idle" });
        },
        [month],
    );

    const requestPreview = useCallback((): void => {
        if (!month) return;

        const request: PendingPreview = { month, invalidated: false };
        latestRequest.current = request;

        setPreview((current) => {
            const previous =
                current.status === "ready" && current.month === month
                    ? { data: current.data, draft: current.draft }
                    : current.status === "loading" && current.month === month
                      ? current.previous
                      : null;

            return { status: "loading", month, previous };
        });

        const run = async (): Promise<void> => {
            try {
                const data = await previewCommissions(month);

                if (latestRequest.current !== request) return;
                latestRequest.current = null;
                setPreview({ status: "ready", month, data, draft: createDraft(data), stale: request.invalidated });
            } catch (error) {
                if (latestRequest.current !== request) return;
                latestRequest.current = null;

                if (error instanceof ApiError) {
                    // The preview endpoint only answers 404 when the commission configuration is missing.
                    const reason = error.status === 404 ? "setup" : "request";
                    setPreview({ status: "error", month, reason, message: error.message });

                    return;
                }

                console.error("Preview request failed", { month, error });
                setPreview({ status: "error", month, reason: "request", message: null });
            }
        };

        void run();
    }, [month]);

    const invalidateMonth = useCallback((changedMonth: string): void => {
        // A response already in flight may have been computed from the old source rows.
        if (latestRequest.current?.month === changedMonth) latestRequest.current.invalidated = true;

        setPreview((current) =>
            current.status === "ready" && current.month === changedMonth ? { ...current, stale: true } : current,
        );
    }, []);

    // Edits apply only to a loaded draft; a draft shown while its recalculation loads is read-only.
    const updateDraft = useCallback((edit: (draft: CalculationDraft) => CalculationDraft): void => {
        setPreview((current) => (current.status === "ready" ? { ...current, draft: edit(current.draft) } : current));
    }, []);

    const editDraft = useMemo<DraftActions>(
        () => ({
            setRowAmount: (agentId, rowId, amountText) => updateDraft((draft) => setDraftRowAmount(draft, agentId, rowId, amountText)),
            removeRow: (agentId, rowId) => updateDraft((draft) => removeDraftRow(draft, agentId, rowId)),
            setAgentIncluded: (agentId, included) => updateDraft((draft) => setDraftAgentIncluded(draft, agentId, included)),
        }),
        [updateDraft],
    );

    const confirmDraft = useCallback((): void => {
        if (submitting.current || preview.status !== "ready" || preview.stale) return;

        const { month: confirmedMonth, draft } = preview;
        const summary = summarizeDraft(draft);

        if (summary.includedAgents === 0 || summary.invalidIncludedRows > 0) return;

        const { request, snapshot } = buildConfirmation(confirmedMonth, draft);

        submitting.current = true;
        setConfirmation({ status: "submitting", snapshot });

        const run = async (): Promise<void> => {
            try {
                const response = await confirmCommissions(request);

                setConfirmation({ status: "done", snapshot, results: response.risultati });
                // Only the draft that was sent is saved; an edit made since then keeps it unsaved.
                setPreview((current) =>
                    current.status === "ready" && current.draft === draft ? { ...current, draft: { ...draft, dirty: false } } : current,
                );
            } catch (error) {
                if (error instanceof ApiError && (error.status === 400 || error.status === 404)) {
                    setConfirmation({ status: "rejected", snapshot, message: error.message });

                    return;
                }

                console.error("Commission confirmation ended with an unknown outcome", { month: confirmedMonth, error });
                setConfirmation({ status: "unknown", snapshot, message: error instanceof ApiError ? error.message : null });
            } finally {
                submitting.current = false;
            }
        };

        void run();
    }, [preview]);

    return { month, preview, selectMonth, requestPreview, invalidateMonth, editDraft, confirmation, confirmDraft };
}
