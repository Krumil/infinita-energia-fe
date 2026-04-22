import { Calendar, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface YearFilterProps {
    availableYears: number[];
    value: number;
    onChange: (year: number) => void;
    variant?: "default" | "card";
    loading?: boolean;
}

export function YearFilter({ availableYears, value, onChange, variant = "default", loading = false }: YearFilterProps) {
    const selectElement = (
        <Select
            value={String(value)}
            onValueChange={(val) => onChange(Number(val))}
            disabled={loading || availableYears.length === 0}
        >
            <SelectTrigger className="w-[130px] bg-background">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue placeholder="Seleziona anno" />}
            </SelectTrigger>
            <SelectContent>
                {availableYears.map((year) => (
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
                        <div className="w-8 h-8 rounded-lg bg-energia-primary/10 flex items-center justify-center text-energia-primary">
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
