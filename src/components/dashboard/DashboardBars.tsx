import type { ReactElement, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReveal } from "./useReveal";

export function Reveal({ className, children }: { className?: string; children: ReactNode }): ReactElement {
    const { attach, className: landClass, style } = useReveal<HTMLDivElement>();

    return (
        <div ref={attach} className={cn(landClass, className)} style={style}>
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
