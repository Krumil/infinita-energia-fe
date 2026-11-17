import { Users, RefreshCw, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, AgentDialog, AgentsTable } from "@/components";
import { useTranslation } from "@/hooks/useTranslation";
import type { Agent, Rule, RuleConfiguration, CreateAgentRequest, Tier } from "@/types";

interface AgentsTabProps {
    agents: Agent[];
    loading: boolean;
    dialogOpen: boolean;
    onDialogOpenChange: (open: boolean) => void;
    editingAgent: Agent | null;
    parentLinked: boolean;
    saving: boolean;
    deleting: boolean;
    onRefresh: () => void;
    onCreateClick: () => void;
    onEdit: (agent: Agent) => void;
    onToggleStatistics: (agent: Agent, value: boolean) => Promise<void>;
    onSave: (data: CreateAgentRequest, customValues?: Array<{ regola_id: number; scaglione_id: number; valore: number }>) => Promise<string | null>;
    onDeleteAgent: (agent: Agent) => void;
    rules: Rule[];
    configuration: RuleConfiguration[];
    configLoading: boolean;
    tiers: Tier[];
}

export function AgentsTab({
    agents,
    loading,
    dialogOpen,
    onDialogOpenChange,
    editingAgent,
    parentLinked,
    saving,
    deleting,
    onRefresh,
    onCreateClick,
    onEdit,
    onToggleStatistics,
    onSave,
    onDeleteAgent,
    rules,
    configuration,
    configLoading,
    tiers,
}: AgentsTabProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-6 lg:h-[calc(100dvh-8.5rem)]">
            <div className="flex shrink-0 items-center justify-between">
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

            {loading && agents.length === 0 ? (
                <div className="ledger-card flex flex-1 items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-energia-accent" />
                </div>
            ) : agents.length === 0 ? (
                <div className="ledger-card p-6">
                    <EmptyState message={t("noAgentsYet")} icon={<Users className="h-16 w-16" />} />
                </div>
            ) : (
                <AgentsTable data={agents} onEdit={onEdit} onToggleStatistics={onToggleStatistics} />
            )}

            <AgentDialog
                key={editingAgent?.id ?? "new"}
                open={dialogOpen}
                onOpenChange={onDialogOpenChange}
                agent={editingAgent}
                parentLinked={parentLinked}
                agents={agents}
                rules={rules}
                tiers={tiers}
                onSave={onSave}
                saving={saving}
                onDelete={editingAgent ? () => onDeleteAgent(editingAgent) : undefined}
                deleting={deleting}
                configuration={configuration}
                configLoading={configLoading}
            />
        </div>
    );
}
