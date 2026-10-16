import { useEffect, useRef, type ReactElement } from "react";
import { useTranslation } from "@/hooks/useTranslation";

// The backend returns whole lists, and mounting thousands of rows freezes the page on open and on every keystroke.
export const ROWS_PAGE_SIZE = 100;

interface ShowMoreRowsProps {
    shown: number;
    total: number;
    onShowMore: (shown: number) => void;
}

/** Shows the next page once it scrolls into view, so it has to sit inside the table's scroll container. */
export function ShowMoreRows({ shown, total, onShowMore }: ShowMoreRowsProps): ReactElement | null {
    const { t, language } = useTranslation();
    const sentinel = useRef<HTMLDivElement>(null);

    // A new observer per page reports the sentinel again, so rows that still don't fill the container load the next page.
    useEffect(() => {
        const element = sentinel.current;

        if (!element) return undefined;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) onShowMore(shown + ROWS_PAGE_SIZE);
        });

        observer.observe(element);

        return () => observer.disconnect();
    }, [shown, total, onShowMore]);

    if (total <= shown) return null;

    return (
        <div ref={sentinel} className="shrink-0 border-t px-4 py-2 text-xs text-muted-foreground">
            {t("rowsShown").replace("{shown}", shown.toLocaleString(language)).replace("{count}", total.toLocaleString(language))}
        </div>
    );
}
