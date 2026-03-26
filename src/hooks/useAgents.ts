import { useState, useCallback, useEffect, useRef } from "react";
import {
    getAgenti,
    createAgente,
    updateAgente,
    deleteAgente,
    getConfigurazioneRegole,
    saveConfigurazioneRegole,
} from "@/api/agents";
import { ApiError } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { Agente, ConfigurazioneRegola, CreateAgentRequest } from "@/types";

export function useAgents() {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [agents, setAgents] = useState<Agente[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agente | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [configurazione, setConfigurazione] = useState<ConfigurazioneRegola[]>([]);
    const [configLoading, setConfigLoading] = useState(false);

    const initialLoadDone = useRef(false);

    const loadAgents = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAgenti();
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
        setConfigurazione([]);
        setDialogOpen(true);
    }, []);

    const openEditDialog = useCallback(async (agent: Agente) => {
        setEditingAgent(agent);
        setConfigurazione([]);
        setDialogOpen(true);
        setConfigLoading(true);
        try {
            const response = await getConfigurazioneRegole(agent.id);
            setConfigurazione(response.configurazione);
        } catch (error) {
            const errorMsg = error instanceof ApiError ? error.message : t("error");
            toast({ title: t("error"), description: errorMsg, variant: "destructive" });
            setConfigurazione([]);
        } finally {
            setConfigLoading(false);
        }
    }, [toast, t]);

    const saveAgent = useCallback(
        async (data: CreateAgentRequest, customValori?: Array<{ regola_id: number; tasso_id: number; valore: number }>): Promise<string | null> => {
            setSaving(true);
            try {
                if (editingAgent) {
                    await updateAgente(editingAgent.id, data);
                    if (customValori && customValori.length > 0) {
                        await saveConfigurazioneRegole(editingAgent.id, { valori: customValori });
                    }
                    toast({ title: t("success"), description: t("agentUpdated") });
                    setDialogOpen(false);
                    await loadAgents();
                    return t("agentUpdated");
                } else {
                    await createAgente(data);
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
        async (agent: Agente): Promise<string | null> => {
            setDeleting(true);
            try {
                await deleteAgente(agent.id);
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

    const toggleStatistiche = useCallback(
        async (agent: Agente, value: boolean): Promise<void> => {
            setAgents((prev) => prev.map((current) => (current.id === agent.id ? { ...current, statistiche: value } : current)));

            try {
                await updateAgente(agent.id, { statistiche: value });
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
        toggleStatistiche,
        configurazione,
        configLoading,
    };
}
