import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import type { Tier } from "@/types/domain";
import { z } from "zod";

const customerTypeSchema = z.enum(["residenziale", "business"]);

const serviceTypeSchema = z.enum(["gas", "luce"]);

interface TiersTableProps {
    tiers: Tier[];
    onUpdateCustomerType: (tier: Tier, value: "residenziale" | "business" | null) => Promise<void>;
    onUpdateServiceType: (tier: Tier, value: "gas" | "luce" | null) => Promise<void>;
}

export function TiersTable({ tiers, onUpdateCustomerType, onUpdateServiceType }: TiersTableProps) {
    const { t } = useTranslation();

    return (
        <div className="border border-border/50 overflow-x-auto rounded-sm shadow-sm">
            <Table appearance="plain" className="ledger-table w-full">
                <TableHeader>
                    <TableRow>
                        <TableHead className="font-medium text-sm normal-case tracking-normal">{t("ruleDescription")}</TableHead>
                        <TableHead className="w-40 font-medium text-sm normal-case tracking-normal">{t("tipoUtenza")}</TableHead>
                        <TableHead className="w-40 font-medium text-sm normal-case tracking-normal">{t("tipoServizio")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tiers.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center py-12 font-display italic text-muted-foreground">
                                {t("noScaglioniYet")}
                            </TableCell>
                        </TableRow>
                    ) : (
                        tiers.map((tier) => (
                            <TableRow key={tier.id}>
                                <TableCell className="font-body font-medium">{tier.descrizione}</TableCell>
                                <TableCell>
                                    <Select
                                        value={tier.tipo_utenza ?? "__none__"}
                                        onValueChange={(value) => {
                                            if (value === "__none__") {
                                                void onUpdateCustomerType(tier, null);

                                                return;
                                            }

                                            const parsedValue = customerTypeSchema.safeParse(value);

                                            if (parsedValue.success) {
                                                void onUpdateCustomerType(tier, parsedValue.data);
                                            }
                                        }}
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
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={tier.tipo_servizio ?? "__none__"}
                                        onValueChange={(value) => {
                                            if (value === "__none__") {
                                                void onUpdateServiceType(tier, null);

                                                return;
                                            }

                                            const parsedValue = serviceTypeSchema.safeParse(value);

                                            if (parsedValue.success) {
                                                void onUpdateServiceType(tier, parsedValue.data);
                                            }
                                        }}
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
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
