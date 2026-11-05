import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { Loader2, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "@/hooks/useTranslation";
import { ApiError } from "@/api/client";
import { saveParentRuleConfiguration } from "@/api/agents";
import { parseEuroNumber } from "@/lib/numbers";
import { ParentValuesPanel, type ParentValueEdit } from "./ParentValuesPanel";
import { RuleValuesEditor } from "./RuleValuesEditor";
import { SearchableSelect } from "./SearchableSelect";
import type { AgentDialogProps } from "@/types/components";
import type { CreateAgentRequest } from "@/types/api";

const tabTriggerClass =
    "min-h-10 gap-2 rounded-none border-b-2 border-transparent px-0 focus-visible:ring-inset focus-visible:ring-offset-0 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none";

// Sized to the agent values editor (45vh plus its header), so a shorter tab doesn't shrink the dialog.
const tabContentClass = "mt-4 min-h-[calc(45vh+6rem)] data-[state=inactive]:hidden";

function InvalidCount({ count }: { count: number }): React.JSX.Element | null {
    const { t } = useTranslation();

    return count > 0 ? (
        <span className="rounded-sm bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
            {t("invalidValuesCount").replace("{count}", String(count))}
        </span>
    ) : null;
}

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
    rules,
    onSave,
    saving,
    onDelete,
    deleting,
    configuration,
    configLoading,
}: AgentDialogProps) {
    const { t } = useTranslation();
    const isEdit = agent !== null;

    const [formData, setFormData] = useState<CreateAgentRequest>(() => createInitialFormData(agent));
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [editedValues, setEditedValues] = useState<Map<string, string>>(new Map());
    const [parentEdits, setParentEdits] = useState<Map<string, ParentValueEdit>>(new Map());
    const [parentSaving, setParentSaving] = useState(false);
    const [tab, setTab] = useState<"agent" | "parent">("agent");
    // The parent tab stays mounted once opened, so a Save with errors can focus its input right away.
    const [parentTabOpened, setParentTabOpened] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    // Radix returns focus to its trigger, and this dialog opens from state, so the opener is kept here.
    const openerRef = useRef<HTMLElement | null>(null);
    // Shown inside the dialog because a modal hides the toasts from assistive technology.
    const [parentSaveError, setParentSaveError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        const nextInitialFormData = createInitialFormData(agent);
        setFormData(nextInitialFormData);
        setEditedValues(new Map());
        setConfirmingDelete(false);
        setParentEdits(new Map());
        setParentSaveError(null);
        setTab("agent");
        setParentTabOpened(false);
    }, [agent, open]);

    const handleValueChange = useCallback((ruleId: number, tierId: number, value: string) => {
        const key = `${ruleId}_${tierId}`;
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

    const invalidEditedCount = useMemo(
        () => Array.from(editedValues.values()).filter((value) => parseEuroNumber(value) === undefined).length,
        [editedValues],
    );

    const savedParent = agent?.agente_padre ?? null;
    const formParent = formData.agente_padre ?? null;
    // The values belong to the saved parent, so they can be edited only while the form still shows it.
    const parentValuesEditable = savedParent !== null && savedParent === formParent;

    // Edits made before the parent changed are dropped with the table, not sent to the old parent.
    const parentValues = parentValuesEditable ? Array.from(parentEdits.values()) : [];
    const invalidParentCount = parentValues.filter((edit) => edit.valore_padre === undefined).length;

    const focusFirstInvalid = (): void => {
        const target = invalidEditedCount > 0 ? "agent" : "parent";

        flushSync(() => setTab(target));

        const panel = formRef.current?.querySelector('[role="tabpanel"][data-state="active"]');

        const input = panel?.querySelector<HTMLInputElement>(
            target === "agent" ? 'input[aria-invalid="true"]' : 'table input[aria-invalid="true"]',
        );

        input?.focus();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (invalidEditedCount > 0 || invalidParentCount > 0) {
            focusFirstInvalid();

            return;
        }

        // Parent values go first: the agent save closes the dialog, and it may also remove the parent they belong to.
        if (agent && parentValues.length > 0) {
            setParentSaving(true);
            setParentSaveError(null);

            try {
                await saveParentRuleConfiguration(agent.id, {
                    valori: parentValues.flatMap(({ regola_id, scaglione_id, valore_padre }) =>
                        valore_padre === undefined ? [] : [{ regola_id, scaglione_id, valore_padre }],
                    ),
                });
            } catch (error) {
                setParentSaveError(error instanceof ApiError ? error.message : t("error"));

                return;
            } finally {
                setParentSaving(false);
            }
        }

        const values =
            isEdit && configuration.length > 0
                ? configuration.map((item) => {
                      const key = `${item.regola_id}_${item.scaglione_id}`;
                      const edited = editedValues.get(key);
                      const value = edited !== undefined ? parseEuroNumber(edited) ?? item.valore : item.valore;

                      return { regola_id: item.regola_id, scaglione_id: item.scaglione_id, valore: value };
                  })
                : undefined;

        // The backend keeps any field the body leaves out, so a cleared parent or email has to go as null.
        await onSave({ ...formData, agente_padre: formData.agente_padre ?? null, mail: formData.mail ?? null }, values);
    };

    const availableParents = useMemo(() => {
        // A descendant as parent would close a loop, which the backend rejects after the parent values are already saved.
        const excluded = new Set<string>(agent ? [agent.nome_cognome] : []);
        const queue = agent ? [agent.nome_cognome] : [];

        for (let name = queue.pop(); name !== undefined; name = queue.pop()) {
            for (const candidate of agents) {
                if (candidate.agente_padre === name && !excluded.has(candidate.nome_cognome)) {
                    excluded.add(candidate.nome_cognome);
                    queue.push(candidate.nome_cognome);
                }
            }
        }

        return agents
            .filter((candidate) => !excluded.has(candidate.nome_cognome))
            .sort((left, right) => left.nome_cognome.localeCompare(right.nome_cognome, undefined, { sensitivity: "base" }));
    }, [agent, agents]);

    const parentOptions = useMemo(
        () => availableParents.map((candidate) => ({ value: candidate.nome_cognome, label: candidate.nome_cognome })),
        [availableParents],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden dialog-ledger"
                onOpenAutoFocus={() => {
                    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                }}
                onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    openerRef.current?.focus();
                }}
            >
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl">
                        {isEdit ? t("editAgent") : t("addAgent")}
                    </DialogTitle>
                    <DialogDescription className="font-body">{t("agentDialogDescription")}</DialogDescription>
                </DialogHeader>
                <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
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
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, nome_cognome: e.target.value }))
                                        }
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
                                        value={formData.agente_padre ?? undefined}
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
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, mail: e.target.value || undefined }))
                                        }
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
                                        <Label
                                            htmlFor="statistiche"
                                            className="font-body text-sm font-medium whitespace-nowrap"
                                        >
                                            {t("statistics")}
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {agent !== null && (
                            <Tabs
                                value={tab}
                                onValueChange={(next) => {
                                    setTab(next === "parent" ? "parent" : "agent");

                                    if (next === "parent") setParentTabOpened(true);
                                }}
                                className="mt-4"
                            >
                                <TabsList className="h-auto w-full justify-start gap-5 rounded-none border-b border-border/60 bg-transparent p-0">
                                    <TabsTrigger value="agent" className={tabTriggerClass}>
                                        {t("agentValues")}
                                        <InvalidCount count={invalidEditedCount} />
                                    </TabsTrigger>
                                    <TabsTrigger value="parent" className={tabTriggerClass}>
                                        {t("parentValues")}
                                        <InvalidCount count={invalidParentCount} />
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="agent" forceMount className={tabContentClass}>
                                    <RuleValuesEditor
                                        configuration={configuration}
                                        rules={rules}
                                        loading={configLoading}
                                        editedValues={editedValues}
                                        onValueChange={handleValueChange}
                                    />
                                </TabsContent>
                                <TabsContent value="parent" forceMount={parentTabOpened || undefined} className={tabContentClass}>
                                    {parentValuesEditable ? (
                                        <ParentValuesPanel
                                            agent={agent}
                                            agentEdits={editedValues}
                                            edits={parentEdits}
                                            onEditsChange={setParentEdits}
                                        />
                                    ) : (
                                        <p className="py-10 text-center text-sm italic text-muted-foreground">
                                            {formParent === null ? t("parentValuesNeedParent") : t("parentValuesNewParent")}
                                        </p>
                                    )}
                                </TabsContent>
                            </Tabs>
                        )}
                    </div>

                    {parentSaveError && <p role="alert" className="pb-3 text-sm text-destructive">{parentSaveError}</p>}

                    <DialogFooter className="shrink-0 pt-4 border-t border-border/50 flex items-center gap-2">
                        {isEdit && onDelete && (
                            <div className="flex-1">
                                <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={saving || deleting}
                                            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            {t("deleteAgent")}
                                        </Button>
                                    </AlertDialogTrigger>
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
                            disabled={saving || parentSaving || deleting}
                            className="btn-ghost"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                saving ||
                                parentSaving ||
                                deleting ||
                                !formData.nome_cognome.trim()
                            }
                            className="btn-primary"
                        >
                            {saving || parentSaving ? (
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
