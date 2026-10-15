import { useState, type ReactElement, type ReactNode } from "react";
import { AlertCircle, BarChart3, Info, Table2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "@/hooks/useTranslation";
import { fillTemplate } from "@/lib/dashboardFormat";
import { cn } from "@/lib/utils";

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

    const toggleClass = (active: boolean): string =>
        cn(
            "h-7 gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground",
            active && "bg-background text-foreground shadow-sm hover:bg-background",
        );

    return (
        // Soft surface: no border, tinted card on the page wash, the brand's quiet shadow.
        <Card
            className={cn("flex min-w-0 flex-col rounded-2xl border-0 shadow-[shadow:var(--ledger-card-shadow)]", className)}
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
                                <BarChart3 className="h-3.5 w-3.5" />
                                {t("dashboardShowChart")}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={toggleClass(showTable)}
                                aria-pressed={showTable}
                                onClick={() => setView("table")}
                            >
                                <Table2 className="h-3.5 w-3.5" />
                                {t("dashboardShowTable")}
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
            <CardContent className={cn("flex-1 space-y-3 px-5 pb-5 transition-opacity sm:px-6 sm:pb-6", loading && "opacity-60")}>
                {showTable ? table : children}
                {notes && <div className="space-y-1 text-xs text-muted-foreground">{notes}</div>}
            </CardContent>
        </Card>
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
