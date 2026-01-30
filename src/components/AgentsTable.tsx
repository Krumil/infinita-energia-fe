import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { ArrowUpDown, Search, X, ChevronLeft, ChevronRight, Pencil, Trash2, Check, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/hooks/useTranslation";
import type { AgentsTableProps } from "@/types/components";
import type { Agente } from "@/types/domain";

function formatCurrency(amount: number, currency: string = "EUR"): string {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(amount);
}

interface ColumnDef {
    key: string;
    defaultWidth: number;
    minWidth: number;
}

interface ResizeHandleProps {
    index: number;
    onMouseDown: (e: React.MouseEvent, index: number) => void;
    onDoubleClick: (index: number) => void;
}

function ResizeHandle({ index, onMouseDown, onDoubleClick }: ResizeHandleProps) {
    return (
        <div
            className="absolute right-0 top-0 h-full w-1 cursor-col-resize group hover:bg-energia-accent/50 z-10"
            onMouseDown={(e) => onMouseDown(e, index)}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onDoubleClick(index);
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-border/50 group-hover:bg-energia-accent rounded-full" />
        </div>
    );
}

const COLUMNS: ColumnDef[] = [
    { key: "nome_cognome", defaultWidth: 140, minWidth: 100 },
    { key: "agente_padre", defaultWidth: 160, minWidth: 100 },
    { key: "gettone_residenziale_standard", defaultWidth: 100, minWidth: 80 },
    { key: "gettone_residenziale_bonus", defaultWidth: 100, minWidth: 80 },
    { key: "gettone_residenziale_malus", defaultWidth: 100, minWidth: 80 },
    { key: "rinnovo_residenziale", defaultWidth: 100, minWidth: 80 },
    { key: "gettone_business_standard", defaultWidth: 100, minWidth: 80 },
    { key: "gettone_business_bonus", defaultWidth: 100, minWidth: 80 },
    { key: "gettone_business_malus", defaultWidth: 100, minWidth: 80 },
    { key: "rinnovo_business", defaultWidth: 100, minWidth: 80 },
    { key: "bonus_sdd", defaultWidth: 100, minWidth: 80 },
    { key: "statistiche", defaultWidth: 80, minWidth: 60 },
    { key: "actions", defaultWidth: 96, minWidth: 96 },
];

const COLUMN_WIDTHS_KEY = "agents-table-column-widths";

export function AgentsTable({ data, onEdit, onDelete, onToggleStatistiche }: AgentsTableProps) {
    const { t } = useTranslation();
    const [sortKey, setSortKey] = useState<keyof Agente>("nome_cognome");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [filter, setFilter] = useState("");
    const [page, setPage] = useState(0);
    const pageSize = 20;

    // Column resize state
    const [columnWidths, setColumnWidths] = useState<number[]>(() => {
        if (typeof window === "undefined") return COLUMNS.map((col) => col.defaultWidth);
        const saved = localStorage.getItem(COLUMN_WIDTHS_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length === COLUMNS.length) {
                    return parsed;
                }
            } catch {
                // Invalid JSON, use defaults
            }
        }
        return COLUMNS.map((col) => col.defaultWidth);
    });
    const resizingRef = useRef<{ index: number; startX: number; startWidth: number } | null>(null);
    const justResizedRef = useRef(false);

    // Popover state for statistiche toggle feedback
    const [popoverState, setPopoverState] = useState<{ agentId: number; added: boolean } | null>(null);

    // Auto-dismiss popover after 1.5 seconds
    useEffect(() => {
        if (popoverState) {
            const timer = setTimeout(() => {
                setPopoverState(null);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [popoverState]);

    // Column resize handlers
    const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        resizingRef.current = {
            index,
            startX: e.clientX,
            startWidth: columnWidths[index],
        };
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    }, [columnWidths]);

    const handleResetColumnWidth = useCallback((index: number) => {
        setColumnWidths((prev) => {
            const next = [...prev];
            next[index] = COLUMNS[index].defaultWidth;
            return next;
        });
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizingRef.current) return;
            const { index, startX, startWidth } = resizingRef.current;
            const diff = e.clientX - startX;
            const newWidth = Math.max(COLUMNS[index].minWidth, startWidth + diff);
            setColumnWidths((prev) => {
                const next = [...prev];
                next[index] = newWidth;
                return next;
            });
        };

        const handleMouseUp = () => {
            if (resizingRef.current) {
                justResizedRef.current = true;
                setTimeout(() => {
                    justResizedRef.current = false;
                }, 0);
            }
            resizingRef.current = null;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    // Persist column widths to localStorage
    useEffect(() => {
        localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(columnWidths));
    }, [columnWidths]);

    const handleToggleStatistiche = useCallback(
        (agent: Agente, checked: boolean) => {
            setPopoverState({ agentId: agent.id, added: checked });
            onToggleStatistiche(agent, checked);
        },
        [onToggleStatistiche],
    );

    const filtered = useMemo(() => {
        if (!filter) return data;
        const lowerFilter = filter.toLowerCase();
        return data.filter(
            (item) =>
                item.nome_cognome.toLowerCase().includes(lowerFilter) ||
                item.agente_padre?.toLowerCase().includes(lowerFilter),
        );
    }, [data, filter]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            if (typeof aVal === "number" && typeof bVal === "number") {
                return sortDir === "asc" ? aVal - bVal : bVal - aVal;
            }
            const aStr = String(aVal);
            const bStr = String(bVal);
            return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });
    }, [filtered, sortKey, sortDir]);

    const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);
    const totalPages = Math.ceil(sorted.length / pageSize);

    const handleSort = (key: keyof Agente) => {
        if (justResizedRef.current) return;
        if (sortKey === key) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const formatRate = (val: number | null) => {
        if (val === null || val === undefined) return "—";
        return formatCurrency(val);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input
                        placeholder={t("filterPlaceholder")}
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value);
                            setPage(0);
                        }}
                        className="pl-10 font-mono text-sm"
                    />
                </div>
                {filter && (
                    <Button variant="ghost" size="sm" onClick={() => setFilter("")} className="btn-ghost">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <div className="border border-border/50 overflow-x-auto rounded-sm shadow-sm">
                <table className="ledger-table w-full">
                    <colgroup>
                        {columnWidths.map((width, i) => (
                            <col key={i} style={{ width }} />
                        ))}
                    </colgroup>
                    <thead>
                        <tr>
                            <th className="relative cursor-pointer hover:text-foreground" onClick={() => handleSort("nome_cognome")}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2 pr-2">
                                            {t("agentName")} <ArrowUpDown className="h-3 w-3 shrink-0" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>{t("agentNameTooltip")}</TooltipContent>
                                </Tooltip>
                                <ResizeHandle onMouseDown={handleMouseDown} onDoubleClick={handleResetColumnWidth} index={0} />
                            </th>
                            <th className="relative cursor-pointer hover:text-foreground" onClick={() => handleSort("agente_padre")}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2 pr-2">
                                            {t("parentAgent")} <ArrowUpDown className="h-3 w-3 shrink-0" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>{t("parentAgentTooltip")}</TooltipContent>
                                </Tooltip>
                                <ResizeHandle onMouseDown={handleMouseDown} onDoubleClick={handleResetColumnWidth} index={1} />
                            </th>
                            <th className="relative text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right pr-2">
                                        {t("residentialStandard")}
                                    </TooltipTrigger>
                                    <TooltipContent>{t("residentialStandardTooltip")}</TooltipContent>
                                </Tooltip>
                                <ResizeHandle onMouseDown={handleMouseDown} onDoubleClick={handleResetColumnWidth} index={2} />
                            </th>
                            <th className="relative text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right pr-2">
                                        {t("residentialBonus")}
                                    </TooltipTrigger>
                                    <TooltipContent>{t("residentialBonusTooltip")}</TooltipContent>
                                </Tooltip>
                                <ResizeHandle onMouseDown={handleMouseDown} onDoubleClick={handleResetColumnWidth} index={3} />
                            </th>
                            <th className="relative text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right pr-2">
                                        {t("residentialMalus")}
                                    </TooltipTrigger>
                                    <TooltipContent>{t("residentialMalusTooltip")}</TooltipContent>
                                </Tooltip>
                                <ResizeHandle onMouseDown={handleMouseDown} onDoubleClick={handleResetColumnWidth} index={4} />
                            </th>
                            <th className="relative text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right pr-2">
                                        {t("residentialRenewal")}
                                    </TooltipTrigger>
                                    <TooltipContent>{t("residentialRenewalTooltip")}</TooltipContent>
                                </Tooltip>
                                <ResizeHandle onMouseDown={handleMouseDown} onDoubleClick={handleResetColumnWidth} index={5} />
                            </th>
                            <th className="relative text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right pr-2">
                                        {t("businessStandard")}
                                    </TooltipTrigger>
                                    <TooltipContent>{t("businessStandardTooltip")}</TooltipContent>
                                </Tooltip>
                                <ResizeHandle onMouseDown={handleMouseDown} onDoubleClick={handleResetColumnWidth} index={6} />
                            </th>
                            <th className="relative text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right pr-2">{t("businessBonus")}</TooltipTrigger>
                                    <TooltipContent>{t("businessBonusTooltip")}</TooltipContent>
                                </Tooltip>
                                <ResizeHandle onMouseDown={handleMouseDown} onDoubleClick={handleResetColumnWidth} index={7} />
                            </th>
                            <th className="relative text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right pr-2">{t("businessMalus")}</TooltipTrigger>
                                    <TooltipContent>{t("businessMalusTooltip")}</TooltipContent>
                                </Tooltip>
                                <ResizeHandle onMouseDown={handleMouseDown} onDoubleClick={handleResetColumnWidth} index={8} />
                            </th>
                            <th className="relative text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right pr-2">
                                        {t("businessRenewal")}
                                    </TooltipTrigger>
                                    <TooltipContent>{t("businessRenewalTooltip")}</TooltipContent>
                                </Tooltip>
                                <ResizeHandle onMouseDown={handleMouseDown} onDoubleClick={handleResetColumnWidth} index={9} />
                            </th>
                            <th className="relative text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right pr-2">{t("sddBonus")}</TooltipTrigger>
                                    <TooltipContent>{t("sddBonusTooltip")}</TooltipContent>
                                </Tooltip>
                                <ResizeHandle onMouseDown={handleMouseDown} onDoubleClick={handleResetColumnWidth} index={10} />
                            </th>
                            <th className="relative text-center">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-center">{t("statistics")}</TooltipTrigger>
                                    <TooltipContent>{t("statisticsTooltip")}</TooltipContent>
                                </Tooltip>
                                <ResizeHandle onMouseDown={handleMouseDown} onDoubleClick={handleResetColumnWidth} index={11} />
                            </th>
                            <th>{t("actions")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={13}
                                    className="text-center py-12 font-display italic text-muted-foreground"
                                >
                                    {t("noDataFound")}
                                </td>
                            </tr>
                        ) : (
                            paginated.map((row) => (
                                <tr key={row.id}>
                                    <td className="font-body font-medium overflow-hidden">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="block line-clamp-2 leading-snug">{row.nome_cognome}</span>
                                            </TooltipTrigger>
                                            <TooltipContent>{row.nome_cognome}</TooltipContent>
                                        </Tooltip>
                                    </td>
                                    <td className="text-muted-foreground overflow-hidden">
                                        {row.agente_padre ? (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="block line-clamp-2 leading-snug">{row.agente_padre}</span>
                                                </TooltipTrigger>
                                                <TooltipContent>{row.agente_padre}</TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td data-numeric className="text-right">
                                        {formatRate(row.gettone_residenziale_standard)}
                                    </td>
                                    <td data-numeric className="text-right">
                                        {formatRate(row.gettone_residenziale_bonus)}
                                    </td>
                                    <td data-numeric className="text-right">
                                        {formatRate(row.gettone_residenziale_malus)}
                                    </td>
                                    <td data-numeric className="text-right">
                                        {formatRate(row.rinnovo_residenziale)}
                                    </td>
                                    <td data-numeric className="text-right">
                                        {formatRate(row.gettone_business_standard)}
                                    </td>
                                    <td data-numeric className="text-right">
                                        {formatRate(row.gettone_business_bonus)}
                                    </td>
                                    <td data-numeric className="text-right">
                                        {formatRate(row.gettone_business_malus)}
                                    </td>
                                    <td data-numeric className="text-right">
                                        {formatRate(row.rinnovo_business)}
                                    </td>
                                    <td data-numeric className="text-right">
                                        {formatRate(row.bonus_sdd)}
                                    </td>
                                    <td className="text-center align-middle">
                                        <div className="flex items-center justify-center">
                                            <Popover open={popoverState?.agentId === row.id}>
                                                <PopoverTrigger asChild>
                                                    <div>
                                                        <Checkbox
                                                            checked={row.statistiche ?? false}
                                                            onCheckedChange={(checked) => {
                                                                handleToggleStatistiche(row, checked === true);
                                                            }}
                                                            aria-label={`${t("statistics")} ${row.nome_cognome}`}
                                                            className="data-[state=checked]:bg-energia-accent data-[state=checked]:border-energia-accent data-[state=checked]:text-white cursor-pointer"
                                                        />
                                                    </div>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    side="top"
                                                    className="w-auto px-3 py-2 text-sm font-medium"
                                                    sideOffset={8}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {popoverState?.added ? (
                                                            <>
                                                                <Check className="h-4 w-4 text-energia-accent" />
                                                                <span>{t("addedToStats")}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XIcon className="h-4 w-4 text-muted-foreground" />
                                                                <span>{t("removedFromStats")}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center justify-end gap-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 hover:bg-secondary/50"
                                                        onClick={() => onEdit(row)}
                                                        aria-label={t("editAgent")}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{t("editAgent")}</TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 hover:bg-secondary/50 text-destructive hover:text-destructive"
                                                        onClick={() => onDelete(row)}
                                                        aria-label={t("deleteAgent")}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{t("deleteAgent")}</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="font-mono text-sm text-muted-foreground">
                        {t("showing")} {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} {t("of")}{" "}
                        {sorted.length}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="btn-ghost"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                            className="btn-ghost"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
