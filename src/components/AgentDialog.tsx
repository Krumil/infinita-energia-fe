import { useState, useMemo, useCallback, useEffect } from "react";
import { Loader2, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { useTranslation } from "@/hooks/useTranslation";
import { parseEuroNumber } from "@/lib/numbers";
import { RuleValuesEditor } from "./RuleValuesEditor";
import { SearchableSelect } from "./SearchableSelect";
import type { AgentDialogProps } from "@/types/components";
import type { CreateAgentRequest } from "@/types/api";

function createInitialFormData(agent: AgentDialogProps["agent"]): CreateAgentRequest {
    return {
        nome_cognome: agent?.nome_cognome ?? "",
        agente_padre: agent?.agente_padre || undefined,
        mail: agent?.mail || undefined,
        statistiche: agent?.statistiche ?? false,
    };
}

export function AgentDialog({
    open,
    onOpenChange,
    agent,
    agents,
    regole,
    onSave,
    saving,
    onDelete,
    deleting,
    configurazione,
    configLoading,
}: AgentDialogProps) {
    const { t } = useTranslation();
    const isEdit = agent !== null;

    const [formData, setFormData] = useState<CreateAgentRequest>(() => createInitialFormData(agent));
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [editedValues, setEditedValues] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        if (!open) {
            return;
        }

        const nextInitialFormData = createInitialFormData(agent);
        setFormData(nextInitialFormData);
        setEditedValues(new Map());
        setConfirmingDelete(false);
    }, [agent, open]);

    const handleValueChange = useCallback((regolaId: number, scaglioneId: number, value: string) => {
        const key = `${regolaId}_${scaglioneId}`;
        setEditedValues((prev) => {
            const next = new Map(prev);
            if (value === "") {
                next.delete(key);
            } else {
                next.set(key, value);
            }
            return next;
        });
    }, []);

    const hasInvalidEditedValues = useMemo(
        () => Array.from(editedValues.values()).some((value) => parseEuroNumber(value) === undefined),
        [editedValues],
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (hasInvalidEditedValues) {
            return;
        }

        const valori = editedValues.size > 0
            ? Array.from(editedValues.entries()).map((entry) => {
                const [key, valore] = entry;
                const [regolaId, scaglioneId] = key.split("_").map(Number);
                return { regola_id: regolaId, scaglione_id: scaglioneId, valore: parseEuroNumber(valore) as number };
            })
            : undefined;
        await onSave(formData, valori);
    };

    const availableParents = useMemo(
        () => agents
            .filter((candidate) => !agent || candidate.id !== agent.id)
            .sort((left, right) => left.nome_cognome.localeCompare(right.nome_cognome, undefined, { sensitivity: "base" })),
        [agent, agents],
    );

    const parentOptions = useMemo(
        () => availableParents.map((candidate) => ({ value: candidate.nome_cognome, label: candidate.nome_cognome })),
        [availableParents],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden dialog-ledger">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl">
                        {isEdit ? t("editAgent") : t("addAgent")}
                    </DialogTitle>
                    <DialogDescription className="font-body">{t("agentsListDesc")}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
                    <div className="flex-1 overflow-y-auto px-1 pt-4 pb-4">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="nome_cognome" className="editorial-caps text-muted-foreground">
                                        {t("agentName")} *
                                    </Label>
                                    <Input
                                        id="nome_cognome"
                                        value={formData.nome_cognome}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, nome_cognome: e.target.value }))}
                                        placeholder={t("exampleName")}
                                        required
                                        className="font-body"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="agente_padre" className="editorial-caps text-muted-foreground">
                                        {t("parentAgent")}
                                    </Label>
                                    <SearchableSelect
                                        id="agente_padre"
                                        value={formData.agente_padre}
                                        onValueChange={(value) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                agente_padre: value,
                                            }))
                                        }
                                        options={parentOptions}
                                        placeholder={t("noParentAgent")}
                                        searchPlaceholder={t("searchParentAgent")}
                                        emptyMessage={t("noParentAgentsFound")}
                                        clearLabel={t("noParentAgent")}
                                        className="font-body"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
                                <div className="space-y-1.5">
                                    <Label htmlFor="mail" className="editorial-caps text-muted-foreground">
                                        {t("email")}
                                    </Label>
                                    <Input
                                        id="mail"
                                        type="email"
                                        value={formData.mail || ""}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, mail: e.target.value || undefined }))}
                                        placeholder="agent@example.com"
                                        className="font-body"
                                    />
                                </div>
                                <div className="rounded-sm border border-border/50 px-4 py-2.5 flex items-center">
                                    <div className="flex items-center gap-2.5">
                                        <Checkbox
                                            id="statistiche"
                                            checked={formData.statistiche ?? false}
                                            onCheckedChange={(checked) =>
                                                setFormData((prev) => ({ ...prev, statistiche: checked === true }))
                                            }
                                        />
                                        <Label htmlFor="statistiche" className="font-body text-sm font-medium whitespace-nowrap">
                                            {t("includeInStatistics")}
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isEdit && (
                            <>
                                <div className="mt-4" />
                                <RuleValuesEditor
                                    configurazione={configurazione}
                                    regole={regole}
                                    loading={configLoading}
                                    editedValues={editedValues}
                                    onValueChange={handleValueChange}
                                />
                            </>
                        )}
                    </div>

                    <DialogFooter className="shrink-0 pt-4 border-t border-border/50 flex items-center gap-2">
                        {isEdit && onDelete && (
                            <div className="flex-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setConfirmingDelete(true)}
                                    disabled={saving || deleting}
                                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t("deleteAgent")}
                                </Button>
                                <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="font-display text-xl">
                                                {t("deleteAgentConfirm")}
                                            </AlertDialogTitle>
                                            <AlertDialogDescription className="font-body">
                                                {t("deleteAgentDescription")}
                                                <span className="block mt-3 font-display text-foreground text-lg">
                                                    {agent?.nome_cognome}
                                                </span>
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="btn-ghost">{t("cancel")}</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => {
                                                    setConfirmingDelete(false);
                                                    onDelete();
                                                }}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                {t("deleteAgent")}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={saving || deleting}
                            className="btn-ghost"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving || deleting || !formData.nome_cognome.trim() || hasInvalidEditedValues}
                            className="btn-primary"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t("saving")}
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    {t("save")}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
