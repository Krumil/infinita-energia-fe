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

export function useAgents() {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [configuration, setConfiguration] = useState<RuleConfiguration[]>([]);
    const [configLoading, setConfigLoading] = useState(false);

    const initialLoadDone = useRef(false);

    const loadAgents = useCallback(async () => {
        setLoading(true);

        try {
            const data = await getAgents();
            setAgents(data);
        } catch (error) {
            const errorMsg = error instanceof ApiError ? error.message : t("error");
            toast({ title: t("error"), description: errorMsg, variant: "destructive" });
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
        setEditingAgent(null);
        setConfiguration([]);
        setDialogOpen(true);
    }, []);

    const openEditDialog = useCallback(async (agent: Agent) => {
        setEditingAgent(agent);
        setConfiguration([]);
        setDialogOpen(true);
        setConfigLoading(true);

        try {
            const response = await getRuleConfiguration(agent.id);
            setConfiguration(response.configurazione);
        } catch (error) {
            const errorMsg = error instanceof ApiError ? error.message : t("error");
            toast({ title: t("error"), description: errorMsg, variant: "destructive" });
            setConfiguration([]);
        } finally {
            setConfigLoading(false);
        }
    }, [toast, t]);

    const saveAgent = useCallback(
        async (data: CreateAgentRequest, customValues?: Array<{ regola_id: number; scaglione_id: number; valore: number }>): Promise<string | null> => {
            setSaving(true);

            try {
                if (editingAgent) {
                    await updateAgent(editingAgent.id, data);

                    if (customValues && customValues.length > 0) {
                        await saveRuleConfiguration(editingAgent.id, { valori: customValues });
                    }

                    toast({ title: t("success"), description: t("agentUpdated") });
                    setDialogOpen(false);
                    await loadAgents();

                    return t("agentUpdated");
                } else {
                    await createAgent(data);
                    toast({ title: t("success"), description: t("agentCreated") });
                    setDialogOpen(false);
                    await loadAgents();

                    return t("agentCreated");
                }
            } catch (error) {
                const errorMsg = error instanceof ApiError ? error.message : t("error");
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });

                return null;
            } finally {
                setSaving(false);
            }
        },
        [editingAgent, loadAgents, toast, t],
    );

    const deleteAgent = useCallback(
        async (agent: Agent): Promise<string | null> => {
            setDeleting(true);

            try {
                await deleteAgentApi(agent.id);
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
        [loadAgents, toast, t],
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
