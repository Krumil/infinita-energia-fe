import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
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

export function MonthPicker({ value, onChange, placeholder = "Seleziona mese", className, disabled }: MonthPickerProps) {
    const selected = parseMonth(value);

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
                    {selected ? format(selected, "MMMM yyyy", { locale: it }) : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={(date) => onChange(date ? toMonthString(date) : "")}
                    locale={it}
                    captionLayout="dropdown"
                />
            </PopoverContent>
        </Popover>
    );
}
