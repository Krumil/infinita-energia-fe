import { useEffect, useRef, type ReactElement } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/hooks/useTranslation";

// The backend returns whole lists, and mounting thousands of rows freezes the page on open and on every keystroke.
export const ROWS_PAGE_SIZE = 100;

interface ShowMoreRowsProps {
    shown: number;
    total: number;
    onShowMore: (shown: number) => void;
    colSpan: number;
}

// Checks for real overflow too, because an overflow-x wrapper also computes overflow-y to auto without scrolling vertically.
function scrollContainer(element: HTMLElement): HTMLElement | null {
    for (let node = element.parentElement; node; node = node.parentElement) {
        const { overflowY } = getComputedStyle(node);

        if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
    }

    return null;
}

/** The last row of a TableBody: shows the next page once it scrolls into view inside the table's scroll container. */
export function ShowMoreRows({ shown, total, onShowMore, colSpan }: ShowMoreRowsProps): ReactElement | null {
    const { t, language } = useTranslation();
    const sentinel = useRef<HTMLTableRowElement>(null);

    // A new observer per page reports the sentinel again, so rows that still don't fill the container load the next page.
    useEffect(() => {
        const element = sentinel.current;

        if (!element) return undefined;

        // With the viewport as root, a container that runs past the bottom of the page would hide the sentinel until the page scrolls too.
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) onShowMore(shown + ROWS_PAGE_SIZE);
        }, { root: scrollContainer(element) });

        observer.observe(element);

        return () => observer.disconnect();
    }, [shown, total, onShowMore]);

    if (total <= shown) return null;

    return (
        <TableRow ref={sentinel} className="hover:bg-transparent">
            <TableCell colSpan={colSpan} className="text-xs text-muted-foreground">
                {t("rowsShown").replace("{shown}", shown.toLocaleString(language)).replace("{count}", total.toLocaleString(language))}
            </TableCell>
        </TableRow>
    );
}
