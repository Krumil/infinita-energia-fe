import { useState, useCallback } from "react";
import { uploadExcel, ApiError } from "@/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { ImportExcelResponse } from "@/types";

export function useOrders() {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<ImportExcelResponse | null>(null);

    const handleUpload = useCallback(
        async (files: File[]): Promise<string | null> => {
            const file = files[0];
            if (!file) return null;

            setImporting(true);
            setProgress(0);
            setResult(null);

            const progressInterval = setInterval(() => {
                setProgress((p) => Math.min(p + 5, 90));
            }, 500);

            try {
                const uploadResult = await uploadExcel(file);
                clearInterval(progressInterval);
                setProgress(100);
                setResult(uploadResult);
                toast({
                    title: t("uploadSuccessful"),
                    description: uploadResult.message,
                });
                return t("ordersImported");
            } catch (error) {
                clearInterval(progressInterval);
                const errorMsg = error instanceof ApiError ? error.message : t("uploadFailed");
                toast({
                    title: t("uploadFailed"),
                    description: errorMsg,
                    variant: "destructive",
                });
                return null;
            } finally {
                setImporting(false);
                setTimeout(() => setProgress(0), 1000);
            }
        },
        [toast, t],
    );

    return {
        importing,
        progress,
        result,
        handleUpload,
    };
}
