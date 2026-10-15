import type { CSSProperties, ReactElement, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Fades a dashboard section up once on mount. The delay staggers sections; fill-mode "both" holds the
 * first frame during the delay, so no opacity-0 class is needed and the HTML export (which turns
 * animations off) never captures a hidden section.
 */
export function Reveal({ index, className, children }: { index: number; className?: string; children: ReactNode }): ReactElement {
    const style: CSSProperties = { animationDelay: `${index * 70}ms`, animationFillMode: "both" };

    return (
        <div className={cn("animate-fade-up motion-reduce:animate-none", className)} style={style}>
            {children}
        </div>
    );
}

interface DeltaProps {
    value: number;
    /** The formatted change, e.g. a percentage or percentage points. */
    label: string;
}

export function Delta({ value, label }: DeltaProps): ReactElement {
    const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;

    return (
        <span
            className={cn(
                "inline-flex items-center gap-0.5 font-medium tabular-nums",
                value > 0 && "text-green-700 dark:text-green-400",
                value < 0 && "text-red-700 dark:text-red-400",
                value === 0 && "text-muted-foreground",
            )}
        >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
        </span>
    );
}
