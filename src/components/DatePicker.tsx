import { useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

function parseDate(value: string): Date | undefined {
    if (!value) return undefined;
    const d = new Date(value + "T00:00:00");
    return isNaN(d.getTime()) ? undefined : d;
}

function toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function DatePicker({ value, onChange, placeholder = "Seleziona data", className, disabled }: DatePickerProps) {
    const selected = parseDate(value);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "justify-start text-left font-normal",
                        !selected && "text-muted-foreground",
                        className,
                    )}
                >
                    <CalendarIcon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    {selected ? format(selected, "dd/MM/yyyy") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={(date) => onChange(date ? toIsoDate(date) : "")}
                    locale={it}
                    captionLayout="dropdown"
                />
            </PopoverContent>
        </Popover>
    );
}

interface MonthPickerProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

function parseMonth(value: string): Date | undefined {
    if (!value) return undefined;
    const d = new Date(value + "-01T00:00:00");
    return isNaN(d.getTime()) ? undefined : d;
}

function toMonthString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

const MONTH_LABELS = [
    "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
    "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

export function MonthPicker({ value, onChange, placeholder = "Seleziona mese", className, disabled }: MonthPickerProps) {
    const selected = parseMonth(value);
    const [open, setOpen] = useState(false);
    const [viewYear, setViewYear] = useState(() => selected?.getFullYear() ?? new Date().getFullYear());

    const selectedMonth = selected ? selected.getMonth() : -1;
    const selectedYear = selected?.getFullYear() ?? -1;

    const handleSelect = (monthIndex: number) => {
        const date = new Date(viewYear, monthIndex, 1);
        onChange(toMonthString(date));
        setOpen(false);
    };

    const handleClear = () => {
        onChange("");
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "justify-start text-left font-normal",
                        !selected && "text-muted-foreground",
                        className,
                    )}
                >
                    <CalendarIcon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    {selected ? format(selected, "MMMM yyyy", { locale: it }) : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-3" align="start">
                <div className="flex items-center justify-between mb-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewYear((y) => y - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">{viewYear}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewYear((y) => y + 1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                    {MONTH_LABELS.map((label, i) => {
                        const isSelected = viewYear === selectedYear && i === selectedMonth;
                        return (
                            <Button
                                key={i}
                                variant={isSelected ? "default" : "ghost"}
                                size="sm"
                                className={cn("h-8 text-xs", isSelected && "btn-primary")}
                                onClick={() => handleSelect(i)}
                            >
                                {label}
                            </Button>
                        );
                    })}
                </div>
                {selected && (
                    <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-muted-foreground" onClick={handleClear}>
                        Cancella
                    </Button>
                )}
            </PopoverContent>
        </Popover>
    );
}
