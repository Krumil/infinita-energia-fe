import { useId, useMemo, useState, type FormEvent, type ReactElement } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/DatePicker";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useTranslation } from "@/hooks/useTranslation";
import { parseDraftAmount } from "@/lib/calculationDraft";
import { monthToEndDate } from "@/lib/competenceDates";
import type { CalculationDetail, Rule } from "@/types";

interface AddDraftRowDialogProps {
    agentName: string;
    seller: string | null;
    month: string;
    rules: Rule[];
    disabled: boolean;
    onAdd: (detail: CalculationDetail, amountText: string) => void;
}

type AddDraftRowFormProps = Omit<AddDraftRowDialogProps, "agentName" | "disabled"> & { onCancel: () => void };

export function AddDraftRowDialog({ agentName, disabled, onAdd, ...formProps }: AddDraftRowDialogProps): ReactElement {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" disabled={disabled}>
                    <Plus className="h-4 w-4" />
                    {t("previewAddRow")}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[480px]" closeLabel={t("close")}>
                <DialogHeader>
                    <DialogTitle className="pr-5 leading-snug">{t("previewAddRowTitle").replace("{name}", agentName)}</DialogTitle>
                    <DialogDescription>{t("previewAddRowDescription")}</DialogDescription>
                </DialogHeader>
                {/* Mounted only while the dialog is open, so every new row starts from an empty form. */}
                <AddDraftRowForm
                    {...formProps}
                    onAdd={(detail, amountText) => {
                        onAdd(detail, amountText);
                        setOpen(false);
                    }}
                    onCancel={() => setOpen(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

function AddDraftRowForm({ seller, month, rules, onAdd, onCancel }: AddDraftRowFormProps): ReactElement {
    const { t } = useTranslation();
    const id = useId();
    const [rule, setRule] = useState<string | undefined>(undefined);
    const [competenceTo, setCompetenceTo] = useState(() => monthToEndDate(month));
    const [amountText, setAmountText] = useState("");
    const [client, setClient] = useState("");
    const [podPdr, setPodPdr] = useState("");
    const [taxId, setTaxId] = useState("");

    // The backend matches a row's rule by description, and several rules can share one.
    const ruleOptions = useMemo(
        () => [...new Set(rules.map((item) => item.descrizione))].map((description) => ({ value: description, label: description })),
        [rules],
    );

    const amount = parseDraftAmount(amountText);
    const amountInvalid = amountText.trim() !== "" && amount === undefined;
    const optionalLabel = (field: string): string => t("previewAddRowOptional").replace("{field}", field);

    const submit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        if (!rule || !competenceTo || amount === undefined) return;

        onAdd(
            {
                venditore: seller,
                comp_al: competenceTo,
                regola: rule,
                importo_provvigione: amount,
                pod_pdr: podPdr.trim() || null,
                cliente: client.trim() || null,
                cf_piva: taxId.trim() || null,
            },
            amountText,
        );
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
                <Label htmlFor={`${id}-rule`}>{t("rule")}</Label>
                <SearchableSelect
                    id={`${id}-rule`}
                    value={rule}
                    onValueChange={setRule}
                    options={ruleOptions}
                    placeholder={t("previewAddRowRulePlaceholder")}
                    searchPlaceholder={t("previewAddRowRuleSearch")}
                    emptyMessage={t("previewAddRowNoRules")}
                    className="w-full"
                />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label htmlFor={`${id}-competence`}>{t("competenceTo")}</Label>
                    <DatePicker id={`${id}-competence`} value={competenceTo} onChange={setCompetenceTo} className="w-full" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor={`${id}-amount`}>{t("commission")}</Label>
                    <Input
                        id={`${id}-amount`}
                        inputMode="decimal"
                        value={amountText}
                        aria-invalid={amountInvalid}
                        aria-describedby={amountInvalid ? `${id}-amount-error` : undefined}
                        onChange={(e) => setAmountText(e.target.value)}
                        className="text-right font-mono aria-[invalid=true]:border-destructive"
                    />
                    {amountInvalid && (
                        <p id={`${id}-amount-error`} className="text-xs font-medium text-destructive">
                            {t("previewInvalidAmount")}
                        </p>
                    )}
                </div>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor={`${id}-client`}>{optionalLabel(t("client"))}</Label>
                <Input id={`${id}-client`} maxLength={255} value={client} onChange={(e) => setClient(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label htmlFor={`${id}-pod`}>{optionalLabel(t("podPdr"))}</Label>
                    <Input id={`${id}-pod`} maxLength={50} value={podPdr} onChange={(e) => setPodPdr(e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor={`${id}-tax`}>{optionalLabel(t("taxId"))}</Label>
                    <Input id={`${id}-tax`} maxLength={255} value={taxId} onChange={(e) => setTaxId(e.target.value)} className="font-mono" />
                </div>
            </div>
            <DialogFooter className="mt-2 gap-2 sm:space-x-0">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    {t("cancel")}
                </Button>
                <Button type="submit" disabled={!rule || !competenceTo || amount === undefined}>
                    {t("previewAddRowSubmit")}
                </Button>
            </DialogFooter>
        </form>
    );
}
