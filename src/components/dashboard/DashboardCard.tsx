import {
    createContext,
    useContext,
    useId,
    useState,
    type CSSProperties,
    type ReactElement,
    type ReactNode,
} from "react";
import { AlertCircle, BarChart3, Info, Table2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "@/hooks/useTranslation";
import { fillTemplate } from "@/lib/dashboardFormat";
import { cn } from "@/lib/utils";
import { useReveal } from "./useReveal";

// True outside a card, so a slot used on its own still shows its chart.
const CardLanded = createContext(true);

interface DashboardCardProps {
    title: string;
    /** The months the figures cover, e.g. "Gen–Ago 2026 vs 2025", so a screenshot or export keeps its context. */
    period?: string;
    description?: ReactNode;
    loading: boolean;
    /** The chart's values as a table, for readers who can't tell the series colors apart. */
    table?: ReactNode;
    notes?: ReactNode;
    children: ReactNode;
    className?: string;
}

export function DashboardCard({
    title,
    period,
    description,
    loading,
    table,
    notes,
    children,
    className,
}: DashboardCardProps): ReactElement {
    const { t } = useTranslation();
    const [view, setView] = useState<"chart" | "table">("chart");
    const showTable = view === "table" && table !== undefined;
    // Cards with a table hold an evilchart, which shows its own skeleton while loading instead of dimming.
    const chartShown = !showTable && table !== undefined;
    const { attach, landed, className: landClass, style: landStyle } = useReveal<HTMLDivElement>();
    const thumbId = useId();
    const reduceMotion = useReducedMotion();

    const toggleClass = (active: boolean): string =>
        cn(
            "relative h-7 rounded-full px-2.5 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground",
            active && "text-foreground",
        );

    const toggleThumb = (
        <motion.span
            layoutId={thumbId}
            className="absolute inset-0 rounded-full bg-background shadow-sm"
            transition={{
                duration: reduceMotion ? 0 : 0.22,
                ease: [0.16, 1, 0.3, 1],
            }}
        />
    );

    return (
        // Soft surface: no border, tinted card on the page wash, the brand's quiet shadow.
        <Card
            ref={attach}
            className={cn(
                "flex min-w-0 flex-col rounded-2xl border-0 shadow-[shadow:var(--ledger-card-shadow)]",
                landClass,
                className,
            )}
            style={landStyle}
            aria-busy={loading}
        >
            {/* The info button sits outside the wrapping row, so it stays top right even when the toggle wraps under the title. */}
            <CardHeader className="flex-row items-start gap-2 space-y-0 p-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                        <h2 className="font-display text-xl leading-tight text-foreground">{title}</h2>
                        {period && <p className="text-sm text-muted-foreground">{period}</p>}
                        {/* The export is static, so the popover can't open there; the description shows inline instead. */}
                        {description && (
                            <CardDescription hidden data-export-only>
                                {description}
                            </CardDescription>
                        )}
                    </div>
                    {table !== undefined && (
                        <div className="flex shrink-0 gap-0.5 rounded-full bg-muted p-0.5" data-export-exclude>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={toggleClass(!showTable)}
                                aria-pressed={!showTable}
                                onClick={() => setView("chart")}
                            >
                                {!showTable && toggleThumb}
                                <span className="relative flex items-center gap-1.5">
                                    <BarChart3 className="h-3.5 w-3.5" />
                                    {t("dashboardShowChart")}
                                </span>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={toggleClass(showTable)}
                                aria-pressed={showTable}
                                onClick={() => setView("table")}
                            >
                                {showTable && toggleThumb}
                                <span className="relative flex items-center gap-1.5">
                                    <Table2 className="h-3.5 w-3.5" />
                                    {t("dashboardShowTable")}
                                </span>
                            </Button>
                        </div>
                    )}
                </div>
                {description && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
                                aria-label={fillTemplate(t("dashboardCardInfo"), { title })}
                                data-export-exclude
                            >
                                <Info />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="text-sm text-muted-foreground">
                            {description}
                        </PopoverContent>
                    </Popover>
                )}
            </CardHeader>
            <CardContent className="flex-1 space-y-3 px-5 pb-5 sm:px-6 sm:pb-6">
                <div
                    key={showTable ? "table" : "chart"}
                    className={cn(
                        "animate-fade-quick space-y-3 transition-opacity",
                        loading && !chartShown && "opacity-60",
                    )}
                >
                    {showTable ? (
                        table
                    ) : (
                        // Remounting replays evilchart's intro when new figures replace the loading skeleton.
                        <CardLanded.Provider key={String(loading)} value={landed}>
                            {children}
                        </CardLanded.Provider>
                    )}
                </div>
                {notes && (
                    <div
                        className={cn(
                            "space-y-1 text-xs text-muted-foreground transition-opacity",
                            loading && "opacity-60",
                        )}
                    >
                        {notes}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface ChartSlotProps {
    /** Sizes the slot, so the card keeps its height before the chart mounts. */
    className?: string;
    style?: CSSProperties;
    children: ReactNode;
}

/** Holds a chart back until its card lands, so evilchart's intro plays where it can be seen. */
export function ChartSlot({ className, style, children }: ChartSlotProps): ReactElement {
    const landed = useContext(CardLanded);

    return (
        <div className={className} style={style}>
            {landed && children}
        </div>
    );
}

interface SectionMessageProps {
    tone: "error" | "empty";
    /** null falls back to the generic fetch error. */
    message: string | null;
}

export function SectionMessage({ tone, message }: SectionMessageProps): ReactElement {
    const { t } = useTranslation();

    if (tone === "error") {
        return (
            <p role="alert" className="flex items-start gap-2 py-4 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {message ?? t("fetchError")}
            </p>
        );
    }

    return <p className="py-4 text-center text-sm text-muted-foreground">{message}</p>;
}
