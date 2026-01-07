import { useState, useMemo } from "react";
import { ArrowUpDown, Search, X, ChevronLeft, ChevronRight, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/hooks/useTranslation";
import type { AgentsTableProps } from "@/types/components";
import type { Agente } from "@/types/domain";

function formatCurrency(amount: number, currency: string = "EUR"): string {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(amount);
}

export function AgentsTable({ data, onEdit, onDelete }: AgentsTableProps) {
    const { t } = useTranslation();
    const [sortKey, setSortKey] = useState<keyof Agente>("nome_cognome");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [filter, setFilter] = useState("");
    const [page, setPage] = useState(0);
    const pageSize = 20;

    const filtered = useMemo(() => {
        if (!filter) return data;
        const lowerFilter = filter.toLowerCase();
        return data.filter(
            (item) =>
                item.nome_cognome.toLowerCase().includes(lowerFilter) ||
                item.agente_padre?.toLowerCase().includes(lowerFilter)
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
            <div className="border border-border/50 overflow-x-auto">
                <table className="ledger-table">
                    <thead>
                        <tr>
                            <th
                                className="cursor-pointer hover:text-foreground"
                                onClick={() => handleSort("nome_cognome")}
                            >
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2">
                                            {t("agentName")} <ArrowUpDown className="h-3 w-3" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>{t("agentNameTooltip")}</TooltipContent>
                                </Tooltip>
                            </th>
                            <th
                                className="cursor-pointer hover:text-foreground"
                                onClick={() => handleSort("agente_padre")}
                            >
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2">
                                            {t("parentAgent")} <ArrowUpDown className="h-3 w-3" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>{t("parentAgentTooltip")}</TooltipContent>
                                </Tooltip>
                            </th>
                            <th className="text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right">
                                        {t("residentialStandard")}
                                    </TooltipTrigger>
                                    <TooltipContent>{t("residentialStandardTooltip")}</TooltipContent>
                                </Tooltip>
                            </th>
                            <th className="text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right">
                                        {t("residentialBonus")}
                                    </TooltipTrigger>
                                    <TooltipContent>{t("residentialBonusTooltip")}</TooltipContent>
                                </Tooltip>
                            </th>
                            <th className="text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right">
                                        {t("residentialMalus")}
                                    </TooltipTrigger>
                                    <TooltipContent>{t("residentialMalusTooltip")}</TooltipContent>
                                </Tooltip>
                            </th>
                            <th className="text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right">
                                        {t("residentialRenewal")}
                                    </TooltipTrigger>
                                    <TooltipContent>{t("residentialRenewalTooltip")}</TooltipContent>
                                </Tooltip>
                            </th>
                            <th className="text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right">
                                        {t("businessStandard")}
                                    </TooltipTrigger>
                                    <TooltipContent>{t("businessStandardTooltip")}</TooltipContent>
                                </Tooltip>
                            </th>
                            <th className="text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right">{t("businessBonus")}</TooltipTrigger>
                                    <TooltipContent>{t("businessBonusTooltip")}</TooltipContent>
                                </Tooltip>
                            </th>
                            <th className="text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right">{t("businessMalus")}</TooltipTrigger>
                                    <TooltipContent>{t("businessMalusTooltip")}</TooltipContent>
                                </Tooltip>
                            </th>
                            <th className="text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right">
                                        {t("businessRenewal")}
                                    </TooltipTrigger>
                                    <TooltipContent>{t("businessRenewalTooltip")}</TooltipContent>
                                </Tooltip>
                            </th>
                            <th className="text-right">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-right">{t("sddBonus")}</TooltipTrigger>
                                    <TooltipContent>{t("sddBonusTooltip")}</TooltipContent>
                                </Tooltip>
                            </th>
                            <th className="text-center">
                                <Tooltip>
                                    <TooltipTrigger className="w-full text-center">
                                        {t("statistics")}
                                    </TooltipTrigger>
                                    <TooltipContent>{t("statisticsTooltip")}</TooltipContent>
                                </Tooltip>
                            </th>
                            <th className="w-[96px]">{t("actions")}</th>
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
                                    <td className="font-body font-medium">{row.nome_cognome}</td>
                                    <td className="text-muted-foreground">{row.agente_padre || "—"}</td>
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
                                    <td className="text-center">
                                        {row.statistiche ? (
                                            <CheckCircle2 className="h-4 w-4 text-energia-success mx-auto" />
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
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
