import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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

function matchesQuery(option: SearchableSelectOption, query: string): boolean {
    return [option.label, option.value, ...(option.keywords ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase());
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
}: SearchableSelectProps): React.JSX.Element {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeItem, setActiveItem] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);
    const selectedOption = options.find((option) => option.value === value);
    const filteredOptions = useMemo(() => options.filter((option) => matchesQuery(option, query)), [options, query]);

    const handleOpenChange = (nextOpen: boolean): void => {
        setOpen(nextOpen);
        setQuery("");
        setActiveItem(selectedOption ? `option:${selectedOption.value}` : options[0] ? `option:${options[0].value}` : "");
    };

    const selectValue = (nextValue: string | undefined): void => {
        onValueChange(nextValue);
        handleOpenChange(false);
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label={selectedOption?.label ?? placeholder}
                    disabled={disabled}
                    className={cn("h-10 w-full justify-between px-3 py-2 font-normal hover:bg-background hover:text-foreground disabled:cursor-not-allowed", className)}
                >
                    <span className={cn("truncate text-left", !selectedOption && "text-muted-foreground")}>
                        {selectedOption?.label ?? placeholder}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    searchInputRef.current?.focus();
                }}
            >
                <Command shouldFilter={false} value={activeItem} onValueChange={setActiveItem}>
                    <CommandInput
                        ref={searchInputRef}
                        value={query}
                        onValueChange={(nextQuery) => {
                            setQuery(nextQuery);
                            const firstMatch = options.find((option) => matchesQuery(option, nextQuery));
                            setActiveItem(firstMatch ? `option:${firstMatch.value}` : "");
                        }}
                        placeholder={searchPlaceholder}
                        aria-label={searchPlaceholder}
                        className="font-body"
                    />
                    <CommandList className="max-h-64 p-1">
                        {clearLabel && (
                            <Button
                                type="button"
                                variant="unstyled"
                                size="unstyled"
                                onClick={() => selectValue(undefined)}
                                onKeyDown={(event) => event.stopPropagation()}
                                className={cn("flex w-full justify-between rounded-sm px-3 py-2 text-left text-sm font-normal font-body hover:bg-muted/60", !value && "bg-muted/40")}
                            >
                                <span>{clearLabel}</span>
                                {!value && <Check className="h-4 w-4 text-energia-accent" />}
                            </Button>
                        )}
                        {filteredOptions.map((option) => (
                            <CommandItem
                                key={option.value}
                                value={`option:${option.value}`}
                                onSelect={() => selectValue(option.value)}
                                className={cn("justify-between px-3 py-2 font-body hover:bg-muted/60", option.value === value && "bg-muted/40")}
                            >
                                <span className="truncate">{option.label}</span>
                                {option.value === value && <Check className="h-4 w-4 text-energia-accent" />}
                            </CommandItem>
                        ))}
                        {filteredOptions.length === 0 && (
                            <p role="status" className="px-3 py-2 text-sm font-body text-muted-foreground">{emptyMessage}</p>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
