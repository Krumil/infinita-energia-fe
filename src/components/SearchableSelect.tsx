import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
    value: string;
    label: string;
    keywords?: string[];
}

interface SearchableSelectProps {
    id?: string;
    value?: string;
    options: SearchableSelectOption[];
    onValueChange: (value: string | undefined) => void;
    placeholder: string;
    searchPlaceholder: string;
    emptyMessage: string;
    clearLabel?: string;
    disabled?: boolean;
    className?: string;
}

export function SearchableSelect({
    id,
    value,
    options,
    onValueChange,
    placeholder,
    searchPlaceholder,
    emptyMessage,
    clearLabel,
    disabled = false,
    className,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value]);

    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        if (!normalizedQuery) {
            return options;
        }

        return options.filter((option) => {
            const haystack = [option.label, option.value, ...(option.keywords ?? [])]
                .join(" ")
                .toLowerCase();

            return haystack.includes(normalizedQuery);
        });
    }, [options, query]);

    useEffect(() => {
        if (!open) {
            setQuery("");
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
        });

        return () => window.cancelAnimationFrame(frame);
    }, [open]);

    const selectValue = (nextValue: string | undefined) => {
        onValueChange(nextValue);
        setOpen(false);
        setQuery("");
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    id={id}
                    type="button"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        className,
                    )}
                >
                    <span className={cn("truncate text-left", !selectedOption && "text-muted-foreground")}>
                        {selectedOption?.label ?? placeholder}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="border-b border-border/50 p-3">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                        <Input
                            ref={searchInputRef}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" && filteredOptions.length > 0) {
                                    event.preventDefault();
                                    selectValue(filteredOptions[0].value);
                                }
                            }}
                            placeholder={searchPlaceholder}
                            className="pl-9 font-body"
                        />
                    </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                    {clearLabel && (
                        <button
                            type="button"
                            onClick={() => selectValue(undefined)}
                            className={cn(
                                "flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm font-body transition-colors hover:bg-muted/60",
                                !value && "bg-muted/40",
                            )}
                        >
                            <span>{clearLabel}</span>
                            {!value && <Check className="h-4 w-4 text-energia-accent" />}
                        </button>
                    )}

                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => {
                            const isSelected = option.value === value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => selectValue(option.value)}
                                    className={cn(
                                        "flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm font-body transition-colors hover:bg-muted/60",
                                        isSelected && "bg-muted/40",
                                    )}
                                >
                                    <span className="truncate">{option.label}</span>
                                    {isSelected && <Check className="h-4 w-4 text-energia-accent" />}
                                </button>
                            );
                        })
                    ) : (
                        <p className="px-3 py-2 text-sm font-body text-muted-foreground">{emptyMessage}</p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
