import { Users, RefreshCw, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { EmptyState, AgentDialog, AgentsTable } from "@/components";
import { useTranslation } from "@/hooks/useTranslation";
import type { Agente, CreateAgentRequest } from "@/types";

interface AgentsTabProps {
    agents: Agente[];
    loading: boolean;
    // Dialog state
    dialogOpen: boolean;
    onDialogOpenChange: (open: boolean) => void;
    editingAgent: Agente | null;
    saving: boolean;
    // Delete dialog state
    deleteDialogOpen: boolean;
    onDeleteDialogOpenChange: (open: boolean) => void;
    deletingAgent: Agente | null;
    // Actions
    onRefresh: () => void;
    onCreateClick: () => void;
    onEdit: (agent: Agente) => void;
    onDelete: (agent: Agente) => void;
    onSave: (data: CreateAgentRequest) => Promise<void>;
    onConfirmDelete: () => void;
    onToggleStatistiche: (agent: Agente, value: boolean) => Promise<void>;
}

export function AgentsTab({
    agents,
    loading,
    dialogOpen,
    onDialogOpenChange,
    editingAgent,
    saving,
    deleteDialogOpen,
    onDeleteDialogOpenChange,
    deletingAgent,
    onRefresh,
    onCreateClick,
    onEdit,
    onDelete,
    onSave,
    onConfirmDelete,
    onToggleStatistiche,
}: AgentsTabProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-display text-2xl">{t("agentsList")}</h2>
                    <p className="font-body text-muted-foreground mt-1">{t("agentsListDesc")}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="btn-ghost">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="ml-2">{t("refreshAgents")}</span>
                    </Button>
                    <Button onClick={onCreateClick} className="btn-primary">
                        <Plus className="h-4 w-4 mr-2" />
                        {t("addAgent")}
                    </Button>
                </div>
            </div>

            <div className="ledger-card p-6">
                {loading && agents.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-energia-accent" />
                    </div>
                ) : agents.length === 0 ? (
                    <EmptyState message={t("noAgentsYet")} icon={<Users className="h-16 w-16" />} />
                ) : (
                    <AgentsTable
                        data={agents}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onToggleStatistiche={onToggleStatistiche}
                    />
                )}
            </div>

            <AgentDialog
                key={editingAgent?.id ?? "new"}
                open={dialogOpen}
                onOpenChange={onDialogOpenChange}
                agent={editingAgent}
                agents={agents}
                onSave={onSave}
                saving={saving}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={onDeleteDialogOpenChange}>
                <AlertDialogContent className="dialog-ledger">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-display text-xl">{t("deleteAgentConfirm")}</AlertDialogTitle>
                        <AlertDialogDescription className="font-body">
                            {t("deleteAgentDescription")}
                            {deletingAgent && (
                                <span className="block mt-3 font-display text-foreground text-lg">
                                    {deletingAgent.nome_cognome}
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="btn-ghost">{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onConfirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {t("deleteAgent")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
