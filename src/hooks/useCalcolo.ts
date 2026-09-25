import { useCallback, useRef, useState } from "react";
import { previewCommissions } from "@/api/calcolo";
import { ApiError } from "@/api/client";
import { currentMonth } from "@/lib/competenceDates";
import type { PreviewResponse } from "@/types";

export type PreviewState =
    | { status: "idle" }
    | { status: "loading"; month: string; previous: PreviewResponse | null }
    | { status: "ready"; month: string; data: PreviewResponse; stale: boolean }
    | { status: "error"; month: string; reason: "setup" | "request"; message: string | null };

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
}

export function useCalculation(): UseCalculationResult {
    const [month, setMonth] = useState(currentMonth);
    const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
    // Only the latest request may update the preview; month changes and newer requests replace it.
    const latestRequest = useRef<PendingPreview | null>(null);

    const selectMonth = useCallback(
        (nextMonth: string): void => {
            if (nextMonth === month) return;
            latestRequest.current = null;
            setMonth(nextMonth);
            setPreview({ status: "idle" });
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
                    ? current.data
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
                setPreview({ status: "ready", month, data, stale: request.invalidated });
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

    return { month, preview, selectMonth, requestPreview, invalidateMonth };
}
