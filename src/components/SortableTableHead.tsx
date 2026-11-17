import type { ReactElement } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type SortDirection = "asc" | "desc";

interface SortableTableHeadProps<F extends string> {
    label: string;
    field: F;
    sortField: F;
    direction: SortDirection;
    onSort: (field: F) => void;
    className?: string;
    tooltip?: string;
}

export function SortableTableHead<F extends string>({
    label,
    field,
    sortField,
    direction,
    onSort,
    className,
    tooltip,
}: SortableTableHeadProps<F>): ReactElement {
    const active = field === sortField;

    const button = (
        <Button
            variant="ghost"
            size="icon"
            className="h-auto w-auto gap-1 rounded-none p-0 text-[length:inherit] [font-weight:inherit] hover:bg-transparent [&_svg]:!size-3"
            onClick={() => onSort(field)}
        >
            {label}
            {active ? direction === "asc" ? <ArrowUp /> : <ArrowDown /> : <ArrowUpDown className="opacity-40" />}
        </Button>
    );

    return (
        <TableHead className={className} aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}>
            {tooltip ? (
                <Tooltip>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent>{tooltip}</TooltipContent>
                </Tooltip>
            ) : (
                button
            )}
        </TableHead>
    );
}
