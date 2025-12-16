import { useState, useCallback, useEffect, useRef } from "react";
import { getAgenti, createAgente, updateAgente, deleteAgente, ApiError } from "@/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { Agente, CreateAgentRequest } from "@/types";

export function useAgents() {
    const { toast } = useToast();
    const { t } = useTranslation();

    // State
    const [agents, setAgents] = useState<Agente[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agente | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingAgent, setDeletingAgent] = useState<Agente | null>(null);

    const initialLoadDone = useRef(false);

    // Load agents
    const loadAgents = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAgenti();
            const agentsWithoutId = data.filter((a) => a.id == null);
            if (agentsWithoutId.length > 0) {
                console.warn("Agents missing id field:", agentsWithoutId);
            }
            setAgents(data);
        } catch (error) {
            const errorMsg = error instanceof ApiError ? error.message : t("error");
            toast({
                title: t("error"),
                description: errorMsg,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [toast, t]);

    useEffect(() => {
        if (initialLoadDone.current) return;
        initialLoadDone.current = true;
        loadAgents();
    }, [loadAgents]);

    // Open create dialog
    const openCreateDialog = useCallback(() => {
        setEditingAgent(null);
        setDialogOpen(true);
    }, []);

    // Open edit dialog
    const openEditDialog = useCallback((agent: Agente) => {
        setEditingAgent(agent);
        setDialogOpen(true);
    }, []);

    // Open delete dialog
    const openDeleteDialog = useCallback((agent: Agente) => {
        setDeletingAgent(agent);
        setDeleteDialogOpen(true);
    }, []);

    // Save agent (create or update)
    const saveAgent = useCallback(
        async (data: CreateAgentRequest): Promise<string | null> => {
            setSaving(true);
            try {
                if (editingAgent && editingAgent.id != null) {
                    await updateAgente(editingAgent.id, data);
                    toast({
                        title: t("success"),
                        description: t("agentUpdated"),
                    });
                    setDialogOpen(false);
                    await loadAgents();
                    return t("agentUpdated");
                } else if (editingAgent && editingAgent.id == null) {
                    console.error("Agent ID is missing:", editingAgent);
                    toast({
                        title: t("error"),
                        description: "Agent ID is missing. Cannot update.",
                        variant: "destructive",
                    });
                    return null;
                } else {
                    await createAgente(data);
                    toast({
                        title: t("success"),
                        description: t("agentCreated"),
                    });
                    setDialogOpen(false);
                    await loadAgents();
                    return t("agentCreated");
                }
            } catch (error) {
                const errorMsg = error instanceof ApiError ? error.message : t("error");
                toast({
                    title: t("error"),
                    description: errorMsg,
                    variant: "destructive",
                });
                return null;
            } finally {
                setSaving(false);
            }
        },
        [editingAgent, loadAgents, toast, t]
    );

    // Delete agent
    const confirmDelete = useCallback(async (): Promise<string | null> => {
        if (!deletingAgent) return null;

        try {
            await deleteAgente(deletingAgent.id);
            toast({
                title: t("success"),
                description: t("agentDeleted"),
            });
            setDeleteDialogOpen(false);
            setDeletingAgent(null);
            await loadAgents();
            return t("agentDeleted");
        } catch (error) {
            const errorMsg = error instanceof ApiError ? error.message : t("error");
            toast({
                title: t("error"),
                description: errorMsg,
                variant: "destructive",
            });
            return null;
        }
    }, [deletingAgent, loadAgents, toast, t]);

    return {
        // State
        agents,
        loading,
        dialogOpen,
        setDialogOpen,
        editingAgent,
        saving,
        deleteDialogOpen,
        setDeleteDialogOpen,
        deletingAgent,
        // Actions
        loadAgents,
        openCreateDialog,
        openEditDialog,
        openDeleteDialog,
        saveAgent,
        confirmDelete,
    };
}
