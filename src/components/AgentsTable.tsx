import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useState, useMemo, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/hooks/useTranslation";
import { matchesSearch } from "@/lib/utils";
import { SearchableSelect } from "./SearchableSelect";
import { ROWS_PAGE_SIZE, ShowMoreRows } from "./ShowMoreRows";
import { SortableTableHead, type SortDirection } from "./SortableTableHead";
import type { AgentsTableProps } from "@/types/components";

type SortKey = "nome_cognome" | "agente_padre_nome" | "mail";

export function AgentsTable({ data, onEdit, onToggleStatistics }: AgentsTableProps) {
    const { t } = useTranslation();

    const [sortKey, setSortKey] = useState<SortKey>("nome_cognome");
    const [sortDir, setSortDir] = useState<SortDirection>("asc");
    const [filter, setFilter] = useState("");
    const [parentFilter, setParentFilter] = useState<string | undefined>(undefined);
    const [shown, setShown] = useState(ROWS_PAGE_SIZE);

    const parentOptions = useMemo(() => {
        const names = new Map<string, string>();

        for (const item of data) {
            if (item.agente_padre) names.set(item.agente_padre, item.agente_padre_nome ?? item.agente_padre);
        }

        return Array.from(names, ([value, label]) => ({ value, label })).sort((left, right) =>
            left.label.localeCompare(right.label, undefined, { sensitivity: "base" }),
        );
    }, [data]);

    const filtered = useMemo(() => {
        return data.filter((item) => {
            const matchesText = matchesSearch(filter, [item.nome_cognome, item.agente_padre_nome, item.mail]);

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

    const handleSort = useCallback((key: SortKey) => {
        if (key === sortKey) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));

            return;
        }

        setSortKey(key);
        setSortDir("asc");
    }, [sortKey]);

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex shrink-0 flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input
                        placeholder={t("filterPlaceholder")}
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value);
                            setShown(ROWS_PAGE_SIZE);
                        }}
                        className="pl-10 font-mono text-sm"
                    />
                </div>
                <div className="md:w-72">
                    <SearchableSelect
                        value={parentFilter}
                        onValueChange={(value) => {
                            setParentFilter(value);
                            setShown(ROWS_PAGE_SIZE);
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
                            setShown(ROWS_PAGE_SIZE);
                        }}
                        className="btn-ghost"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <div className="ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
                <Table containerClassName="min-h-0 flex-1">
                    <TableHeader>
                        <TableRow>
                            <SortableTableHead label={t("agentName")} tooltip={t("agentNameTooltip")} field="nome_cognome"
                                sortField={sortKey} direction={sortDir} onSort={handleSort} />
                            <SortableTableHead label={t("parentAgent")} tooltip={t("parentAgentTooltip")} field="agente_padre_nome"
                                sortField={sortKey} direction={sortDir} onSort={handleSort} />
                            <SortableTableHead label={t("email")} field="mail" sortField={sortKey} direction={sortDir} onSort={handleSort} />
                            <TableHead className="text-center">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span>{t("statistics")}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>{t("statisticsTooltip")}</TooltipContent>
                                </Tooltip>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sorted.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 font-display italic text-muted-foreground">
                                    {t("noDataFound")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            sorted.slice(0, shown).map((row) => (
                                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onEdit(row)}>
                                    <TableCell className="font-body font-medium overflow-hidden">
                                        <Button
                                            type="button"
                                            variant="unstyled"
                                            size="unstyled"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit(row);
                                            }}
                                            className="block whitespace-normal text-left font-[inherit] font-medium line-clamp-2 leading-snug hover:underline"
                                        >
                                            {row.nome_cognome}
                                        </Button>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground overflow-hidden">
                                        {row.agente_padre ? (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="block line-clamp-2 leading-snug">{row.agente_padre_nome ?? row.agente_padre}</span>
                                                </TooltipTrigger>
                                                <TooltipContent>{row.agente_padre_nome ?? row.agente_padre}</TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            "—"
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {row.mail || "—"}
                                    </TableCell>
                                    <TableCell
                                        className="text-center"
                                        onClick={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center justify-center">
                                            <Checkbox
                                                checked={row.statistiche ?? false}
                                                onCheckedChange={(checked) => void onToggleStatistics(row, checked === true)}
                                                aria-label={`${t("statistics")} ${row.nome_cognome}`}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                        <ShowMoreRows shown={shown} total={sorted.length} onShowMore={setShown} colSpan={4} />
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
