import { Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { AVAILABLE_YEARS, type AvailableYear } from "@/data/dashboardMockData";

interface YearFilterProps {
    value: AvailableYear;
    onChange: (year: AvailableYear) => void;
    variant?: "default" | "card";
}

export function YearFilter({ value, onChange, variant = "default" }: YearFilterProps) {
    const selectElement = (
        <Select value={String(value)} onValueChange={(val) => onChange(Number(val) as AvailableYear)}>
            <SelectTrigger className="w-[130px] bg-background">
                <SelectValue placeholder="Seleziona anno" />
            </SelectTrigger>
            <SelectContent>
                {AVAILABLE_YEARS.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                        {year}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    if (variant === "card") {
        return (
            <Card className="animate-fade-up">
                <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--energia-primary)/0.1)] flex items-center justify-center text-[hsl(var(--energia-primary))]">
                            <Calendar className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground">Periodo:</span>
                            {selectElement}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Periodo:</span>
            {selectElement}
        </div>
    );
}
