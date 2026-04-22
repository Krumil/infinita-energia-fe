import { Users, RefreshCw, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, AgentDialog, AgentsTable } from "@/components";
import { useTranslation } from "@/hooks/useTranslation";
import type { Agente, Regola, ConfigurazioneRegola, CreateAgentRequest, Scaglione } from "@/types";

interface AgentsTabProps {
    agents: Agente[];
    loading: boolean;
    dialogOpen: boolean;
    onDialogOpenChange: (open: boolean) => void;
    editingAgent: Agente | null;
    saving: boolean;
    deleting: boolean;
    onRefresh: () => void;
    onCreateClick: () => void;
    onEdit: (agent: Agente) => void;
    onToggleStatistiche: (agent: Agente, value: boolean) => Promise<void>;
    onSave: (data: CreateAgentRequest, customValori?: Array<{ regola_id: number; scaglione_id: number; valore: number }>) => Promise<void>;
    onDeleteAgent: (agent: Agente) => void;
    regole: Regola[];
    configurazione: ConfigurazioneRegola[];
    configLoading: boolean;
    scaglioni: Scaglione[];
}

export function AgentsTab({
    agents,
    loading,
    dialogOpen,
    onDialogOpenChange,
    editingAgent,
    saving,
    deleting,
    onRefresh,
    onCreateClick,
    onEdit,
    onToggleStatistiche,
    onSave,
    onDeleteAgent,
    regole,
    configurazione,
    configLoading,
    scaglioni,
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
                regole={regole}
                scaglioni={scaglioni}
                onSave={onSave}
                saving={saving}
                onDelete={editingAgent ? () => onDeleteAgent(editingAgent) : undefined}
                deleting={deleting}
                configurazione={configurazione}
                configLoading={configLoading}
            />
        </div>
    );
}
