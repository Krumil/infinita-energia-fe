import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

type PendingChange =
    | { tier: Tier; field: "tipo_utenza"; value: z.infer<typeof customerTypeSchema> }
    | { tier: Tier; field: "tipo_servizio"; value: z.infer<typeof serviceTypeSchema> | null };

export function TiersTable({ tiers, onUpdateCustomerType, onUpdateServiceType }: TiersTableProps) {
    const { t } = useTranslation();
    // Changing a type deletes agent values, so it is applied only after the user confirms.
    const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

    const confirmChange = (): void => {
        if (!pendingChange) return;

        if (pendingChange.field === "tipo_utenza") void onUpdateCustomerType(pendingChange.tier, pendingChange.value);
        else void onUpdateServiceType(pendingChange.tier, pendingChange.value);

        setPendingChange(null);
    };

    const changeDescription = (change: PendingChange): string =>
        t("confirmTierTypeDescription")
            .replace("{tier}", change.tier.descrizione)
            .replace("{field}", t(change.field === "tipo_utenza" ? "tipoUtenza" : "tipoServizio"))
            .replace("{old}", t(change.tier[change.field] ?? "typeNotSet"))
            .replace("{new}", t(change.value ?? "typeNotSet"));

    return (
        <div className="border border-border/50 overflow-x-auto rounded-sm shadow-sm">
            <Table appearance="plain" className="ledger-table w-full table-fixed">
                <TableHeader>
                    <TableRow>
                        <TableHead className="font-medium text-sm normal-case tracking-normal">{t("ruleDescription")}</TableHead>
                        <TableHead className="w-48 font-medium text-sm normal-case tracking-normal">{t("tipoUtenza")}</TableHead>
                        <TableHead className="w-48 font-medium text-sm normal-case tracking-normal">{t("tipoServizio")}</TableHead>
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
                                <TableCell className="font-body font-medium leading-snug">{tier.descrizione}</TableCell>
                                <TableCell>
                                    <Select
                                        value={tier.tipo_utenza ?? ""}
                                        onValueChange={(value) => {
                                            const parsedValue = customerTypeSchema.safeParse(value);

                                            if (parsedValue.success) {
                                                setPendingChange({ tier, field: "tipo_utenza", value: parsedValue.data });
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="h-8 gap-2 text-sm">
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="residenziale">{t("residenziale")}</SelectItem>
                                            <SelectItem value="business">{t("business")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={tier.tipo_servizio ?? ""}
                                        onValueChange={(value) => {
                                            if (value === "__none__") {
                                                setPendingChange({ tier, field: "tipo_servizio", value: null });

                                                return;
                                            }

                                            const parsedValue = serviceTypeSchema.safeParse(value);

                                            if (parsedValue.success) {
                                                setPendingChange({ tier, field: "tipo_servizio", value: parsedValue.data });
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="h-8 gap-2 text-sm">
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tier.tipo_servizio !== null && <SelectItem value="__none__">—</SelectItem>}
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

            <AlertDialog open={pendingChange !== null} onOpenChange={(open) => !open && setPendingChange(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmTierTypeTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{pendingChange && changeDescription(pendingChange)}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmChange}>{t("confirm")}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
