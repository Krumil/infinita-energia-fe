import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import type { Scaglione } from "@/types/domain";

interface ScagloniTableProps {
    scaglioni: Scaglione[];
    onUpdateTipoUtenza: (scaglione: Scaglione, value: "residenziale" | "business" | null) => Promise<void>;
    onUpdateTipoServizio: (scaglione: Scaglione, value: "gas" | "luce" | null) => Promise<void>;
}

export function ScagloniTable({ scaglioni, onUpdateTipoUtenza, onUpdateTipoServizio }: ScagloniTableProps) {
    const { t } = useTranslation();

    return (
        <div className="border border-border/50 overflow-x-auto rounded-sm shadow-sm">
            <table className="ledger-table w-full">
                <thead>
                    <tr>
                        <th className="font-medium text-sm normal-case tracking-normal">{t("ruleDescription")}</th>
                        <th className="w-40 font-medium text-sm normal-case tracking-normal">{t("tipoUtenza")}</th>
                        <th className="w-40 font-medium text-sm normal-case tracking-normal">{t("tipoServizio")}</th>
                    </tr>
                </thead>
                <tbody>
                    {scaglioni.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="text-center py-12 font-display italic text-muted-foreground">
                                {t("noScaglioniYet")}
                            </td>
                        </tr>
                    ) : (
                        scaglioni.map((scaglione) => (
                            <tr key={scaglione.id}>
                                <td className="font-body font-medium">{scaglione.descrizione}</td>
                                <td>
                                    <Select
                                        value={scaglione.tipo_utenza ?? "__none__"}
                                        onValueChange={(value) =>
                                            onUpdateTipoUtenza(scaglione, value === "__none__" ? null : value as "residenziale" | "business")
                                        }
                                    >
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">—</SelectItem>
                                            <SelectItem value="residenziale">{t("residenziale")}</SelectItem>
                                            <SelectItem value="business">{t("business")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>
                                <td>
                                    <Select
                                        value={scaglione.tipo_servizio ?? "__none__"}
                                        onValueChange={(value) =>
                                            onUpdateTipoServizio(scaglione, value === "__none__" ? null : value as "gas" | "luce")
                                        }
                                    >
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">—</SelectItem>
                                            <SelectItem value="gas">{t("gas")}</SelectItem>
                                            <SelectItem value="luce">{t("luce")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
