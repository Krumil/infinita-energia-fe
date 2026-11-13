import { useState, useCallback, useEffect, useRef } from "react";
import {
    getAgents,
    createAgent,
    updateAgent,
    deleteAgent as deleteAgentApi,
    getRuleConfiguration,
    saveRuleConfiguration,
} from "@/api/agents";
import { ApiError } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { Agent, RuleConfiguration, CreateAgentRequest } from "@/types";

interface Options {
    // Called after a change that can alter commission amounts, so an open preview can be marked stale.
    onChanged?: () => void;
}

export function useAgents({ onChanged }: Options = {}) {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [parentLinked, setParentLinked] = useState(false);

    const [configuration, setConfiguration] = useState<RuleConfiguration[]>([]);
    const [configLoading, setConfigLoading] = useState(false);

    const initialLoadDone = useRef(false);
    // Only the latest opened agent may fill the dialog; a slower answer for another agent would be saved onto this one.
    const configRequestRef = useRef(0);

    const loadAgents = useCallback(async (): Promise<Agent[] | null> => {
        setLoading(true);

        try {
            const data = await getAgents();
            setAgents(data);

            return data;
        } catch (error) {
            const errorMsg = error instanceof ApiError ? error.message : t("error");
            toast({ title: t("error"), description: errorMsg, variant: "destructive" });

            return null;
        } finally {
            setLoading(false);
        }
    }, [toast, t]);

    useEffect(() => {
        if (initialLoadDone.current) return;
        initialLoadDone.current = true;
        loadAgents();
    }, [loadAgents]);

    const openCreateDialog = useCallback(() => {
        configRequestRef.current += 1;
        setConfigLoading(false);
        setEditingAgent(null);
        setParentLinked(false);
        setConfiguration([]);
        setDialogOpen(true);
    }, []);

    const openEditDialog = useCallback(async (agent: Agent, linked = false) => {
        const requestId = ++configRequestRef.current;
        setEditingAgent(agent);
        setParentLinked(linked);
        setConfiguration([]);
        setDialogOpen(true);
        setConfigLoading(true);

        try {
            const response = await getRuleConfiguration(agent.id);

            if (requestId === configRequestRef.current) setConfiguration(response.configurazione);
        } catch (error) {
            if (requestId !== configRequestRef.current) return;

            const errorMsg = error instanceof ApiError ? error.message : t("error");
            toast({ title: t("error"), description: errorMsg, variant: "destructive" });
            setConfiguration([]);
        } finally {
            if (requestId === configRequestRef.current) setConfigLoading(false);
        }
    }, [toast, t]);

    const saveAgent = useCallback(
        async (data: CreateAgentRequest, customValues?: Array<{ regola_id: number; scaglione_id: number; valore: number }>): Promise<string | null> => {
            setSaving(true);

            try {
                let agentId: number;

                if (editingAgent) {
                    await updateAgent(editingAgent.id, data);

                    if (customValues && customValues.length > 0) {
                        await saveRuleConfiguration(editingAgent.id, { valori: customValues });
                    }

                    agentId = editingAgent.id;
                } else {
                    agentId = (await createAgent(data)).agente_id;
                }

                const message = editingAgent ? t("agentUpdated") : t("agentCreated");
                const linked = Boolean(data.agente_padre) && data.agente_padre !== (editingAgent?.agente_padre ?? null);

                onChanged?.();
                toast({ title: t("success"), description: message });

                if (!linked) {
                    setDialogOpen(false);
                    await loadAgents();

                    return message;
                }

                // The backend doesn't set the values a newly linked parent earns, so the dialog moves to them instead of closing.
                const saved = (await loadAgents())?.find((agent) => agent.id === agentId);

                if (saved) {
                    await openEditDialog(saved, true);
                } else {
                    setDialogOpen(false);
                }

                return message;
            } catch (error) {
                const errorMsg = error instanceof ApiError ? error.message : t("error");
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });

                // A failed edit can still have stored the agent row or the parent values the dialog sends first.
                if (editingAgent) {
                    onChanged?.();
                    await loadAgents();
                }

                return null;
            } finally {
                setSaving(false);
            }
        },
        [editingAgent, loadAgents, onChanged, openEditDialog, toast, t],
    );

    const deleteAgent = useCallback(
        async (agent: Agent): Promise<string | null> => {
            setDeleting(true);

            try {
                await deleteAgentApi(agent.id);
                onChanged?.();
                toast({ title: t("success"), description: t("agentDeleted") });
                setDialogOpen(false);
                await loadAgents();

                return t("agentDeleted");
            } catch (error) {
                const errorMsg = error instanceof ApiError ? error.message : t("error");
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });

                return null;
            } finally {
                setDeleting(false);
            }
        },
        [loadAgents, onChanged, toast, t],
    );

    const toggleStatistics = useCallback(
        async (agent: Agent, value: boolean): Promise<void> => {
            setAgents((prev) => prev.map((current) => (current.id === agent.id ? { ...current, statistiche: value } : current)));

            try {
                await updateAgent(agent.id, { statistiche: value });
            } catch (error) {
                setAgents((prev) =>
                    prev.map((current) => (current.id === agent.id ? { ...current, statistiche: agent.statistiche } : current)),
                );
                const errorMsg = error instanceof ApiError ? error.message : t("error");
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });
            }
        },
        [toast, t],
    );

    return {
        agents,
        loading,
        dialogOpen,
        setDialogOpen,
        editingAgent,
        parentLinked,
        saving,
        deleting,
        loadAgents,
        openCreateDialog,
        openEditDialog,
        saveAgent,
        deleteAgent,
        toggleStatistics,
        configuration,
        configLoading,
    };
}
