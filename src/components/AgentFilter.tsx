import { User, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";

interface AgentFilterProps {
    availableAgents: string[];
    value: string | null;
    onChange: (agent: string | null) => void;
    loading?: boolean;
}

export function AgentFilter({ availableAgents, value, onChange, loading = false }: AgentFilterProps) {
    const { t } = useTranslation();

    return (
        <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{t("agent")}:</span>
            <Select
                value={value ?? "__totale__"}
                onValueChange={(val) => onChange(val === "__totale__" ? null : val)}
                disabled={loading || availableAgents.length === 0}
            >
                <SelectTrigger className="w-[160px] bg-background">
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <SelectValue placeholder={t("total")} />
                    )}
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__totale__">{t("total")}</SelectItem>
                    {availableAgents.map((agent) => (
                        <SelectItem key={agent} value={agent}>
                            {agent}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
