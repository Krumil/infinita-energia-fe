import { useState, useMemo, useCallback } from "react";
import { ArrowUpDown, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/hooks/useTranslation";
import { SearchableSelect } from "./SearchableSelect";
import type { AgentsTableProps } from "@/types/components";
import type { Agente } from "@/types/domain";

export function AgentsTable({ data, onEdit, onToggleStatistiche }: AgentsTableProps) {
    const { t } = useTranslation();

    const [sortKey, setSortKey] = useState<keyof Agente>("nome_cognome");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [filter, setFilter] = useState("");
    const [parentFilter, setParentFilter] = useState<string | undefined>(undefined);
    const [page, setPage] = useState(0);
    const pageSize = 20;

    const parentOptions = useMemo(() => {
        return Array.from(
            new Set(
                data
                    .map((item) => item.agente_padre?.trim())
                    .filter((value): value is string => Boolean(value)),
            ),
        )
            .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }))
            .map((value) => ({ value, label: value }));
    }, [data]);

    const filtered = useMemo(() => {
        const lowerFilter = filter.trim().toLowerCase();

        return data.filter((item) => {
            const matchesText =
                lowerFilter === "" ||
                item.nome_cognome.toLowerCase().includes(lowerFilter) ||
                item.agente_padre?.toLowerCase().includes(lowerFilter) ||
                item.mail?.toLowerCase().includes(lowerFilter);

            const matchesParent = !parentFilter || item.agente_padre === parentFilter;

            return matchesText && matchesParent;
        });
    }, [data, filter, parentFilter]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            const aStr = String(aVal);
            const bStr = String(bVal);
            return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });
    }, [filtered, sortKey, sortDir]);

    const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);
    const totalPages = Math.ceil(sorted.length / pageSize);

    const handleSort = useCallback((key: keyof Agente) => {
        setSortKey((prev) => {
            if (prev === key) {
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                return prev;
            }
            setSortDir("asc");
            return key;
        });
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
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
                <div className="md:w-72">
                    <SearchableSelect
                        value={parentFilter}
                        onValueChange={(value) => {
                            setParentFilter(value);
                            setPage(0);
                        }}
                        options={parentOptions}
                        placeholder={t("allParentAgents")}
                        searchPlaceholder={t("searchParentAgent")}
                        emptyMessage={t("noParentAgentsFound")}
                        clearLabel={t("allParentAgents")}
                        className="font-body"
                    />
                </div>
                {(filter || parentFilter) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setFilter("");
                            setParentFilter(undefined);
                            setPage(0);
                        }}
                        className="btn-ghost"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <div className="border border-border/50 overflow-x-auto rounded-sm shadow-sm">
                <table className="ledger-table w-full">
                    <thead>
                        <tr>
                            <th className="cursor-pointer hover:text-foreground" onClick={() => handleSort("nome_cognome")}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2">
                                            {t("agentName")} <ArrowUpDown className="h-3 w-3 shrink-0" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>{t("agentNameTooltip")}</TooltipContent>
                                </Tooltip>
                            </th>
                            <th className="cursor-pointer hover:text-foreground" onClick={() => handleSort("agente_padre")}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2">
                                            {t("parentAgent")} <ArrowUpDown className="h-3 w-3 shrink-0" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>{t("parentAgentTooltip")}</TooltipContent>
                                </Tooltip>
                            </th>
                            <th className="cursor-pointer hover:text-foreground" onClick={() => handleSort("mail")}>
                                <div className="flex items-center gap-2">
                                    {t("email")} <ArrowUpDown className="h-3 w-3 shrink-0" />
                                </div>
                            </th>
                            <th className="text-center">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center justify-center gap-2">
                                            {t("statistics")}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>{t("statisticsTooltip")}</TooltipContent>
                                </Tooltip>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center py-12 font-display italic text-muted-foreground">
                                    {t("noDataFound")}
                                </td>
                            </tr>
                        ) : (
                            paginated.map((row) => (
                                <tr key={row.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onEdit(row)}>
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
                                    <td className="text-muted-foreground">
                                        {row.mail || "—"}
                                    </td>
                                    <td
                                        className="text-center"
                                        onClick={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center justify-center">
                                            <Checkbox
                                                checked={row.statistiche ?? false}
                                                onCheckedChange={(checked) => void onToggleStatistiche(row, checked === true)}
                                                aria-label={`${t("statistics")} ${row.nome_cognome}`}
                                            />
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
