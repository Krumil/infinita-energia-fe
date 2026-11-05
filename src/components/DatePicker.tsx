import { useState } from "react";
import { format } from "date-fns";
import { enUS, it } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

interface DatePickerProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    // ISO date whose month the calendar shows while no date is selected.
    openOn?: string;
    // "right" keeps the calendar from flipping above a field and covering what sits over it, such as a dialog's title.
    side?: "bottom" | "right";
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

// The dropdown would otherwise stop at the current year, which blocks dates such as a future due date.
const YEARS_BACK = 100;

const YEARS_AHEAD = 10;

export function DatePicker({ id, value, onChange, placeholder = "Seleziona data", className, disabled, openOn = "", side = "bottom" }: DatePickerProps) {
    const { language } = useTranslation();
    const selected = parseDate(value);
    const thisYear = new Date().getFullYear();

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    id={id}
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
            <PopoverContent className="w-auto p-0" side={side} align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    defaultMonth={selected ?? parseDate(openOn)}
                    onSelect={(date) => onChange(date ? toIsoDate(date) : "")}
                    locale={language === "it" ? it : enUS}
                    captionLayout="dropdown"
                    startMonth={new Date(thisYear - YEARS_BACK, 0)}
                    endMonth={new Date(thisYear + YEARS_AHEAD, 11)}
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

function shortMonthLabels(language: string): string[] {
    const formatter = new Intl.DateTimeFormat(language, { month: "short" });

    // Intl returns "gen" in Italian; the grid has always shown "Gen".
    return Array.from({ length: 12 }, (_, month) => {
        const label = formatter.format(new Date(2000, month, 1));

        return label.charAt(0).toLocaleUpperCase(language) + label.slice(1);
    });
}

export function MonthPicker({ value, onChange, placeholder = "Seleziona mese", className, disabled }: MonthPickerProps) {
    const { t, language } = useTranslation();
    const selected = parseMonth(value);
    const [open, setOpen] = useState(false);
    const [viewYear, setViewYear] = useState(() => selected?.getFullYear() ?? new Date().getFullYear());

    // Wide enough to reach a distant year in one step, and always holding the year being viewed.
    const thisYear = new Date().getFullYear();
    const firstYear = Math.min(thisYear - 20, viewYear);
    const lastYear = Math.max(thisYear + 20, viewYear);

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
                    {selected ? new Intl.DateTimeFormat(language, { month: "long", year: "numeric" }).format(selected) : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-3" align="start">
                <div className="flex items-center justify-between mb-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t("pickerPreviousYear")} onClick={() => setViewYear((y) => y - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <select
                        aria-label={t("pickerYear")}
                        value={viewYear}
                        onChange={(event) => setViewYear(Number(event.target.value))}
                        className="rounded-md bg-transparent px-1 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i).map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t("pickerNextYear")} onClick={() => setViewYear((y) => y + 1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                    {shortMonthLabels(language).map((label, i) => {
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
                        {t("clearMonth")}
                    </Button>
                )}
            </PopoverContent>
        </Popover>
    );
}
