import { useCallback, useState } from "react";

export type ConfirmKey = "rule-change" | "parent-prefill" | "agent-delete" | "attachment-delete" | "commissions-save" | "preview-discard";

export interface ConfirmSkip {
    checked: boolean;
    setChecked: (checked: boolean) => void;
    isSkipped: () => boolean;
    remember: () => void;
}

function storageKey(key: ConfirmKey): string {
    return `app-skip-confirm-${key}`;
}

// One "don't show again" choice per confirm dialog, kept in this browser's localStorage.
export function useConfirmSkip(key: ConfirmKey): ConfirmSkip {
    const [checked, setChecked] = useState(false);

    const isSkipped = useCallback((): boolean => localStorage.getItem(storageKey(key)) === "1", [key]);

    // Stored when the action is confirmed, so ticking the box and cancelling changes nothing.
    const remember = useCallback((): void => {
        if (checked) localStorage.setItem(storageKey(key), "1");
    }, [key, checked]);

    return { checked, setChecked, isSkipped, remember };
}
