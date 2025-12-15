import { useState, useEffect, useMemo } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/toaster";

// Layout components
import { AppHeader, AppFooter } from "@/components";

// Page components
import { DashboardTab, AgentsTab, OrdiniTab, CalcoloTab } from "@/pages";

// Custom hooks
import { useAppSettings, useAgents, useOrders, useLiquidazioni, useCalcolo } from "@/hooks";

// ========== Main App Component ==========

export default function App() {

    // Tab navigation state
    const [activeTab, setActiveTab] = useState<string>("dashboard");

    // Last action for footer (shared state across hooks)
    const [lastAction, setLastAction] = useState<string | null>(null);

    // Custom hooks for state management
    const appSettings = useAppSettings();
    const agents = useAgents();
    const orders = useOrders();
    const liquidazioni = useLiquidazioni();
    const calcolo = useCalcolo(agents.agents);

    // Sync activeTab with URL hash
    useEffect(() => {
        const hash = window.location.hash.replace("#", "") || "dashboard";
        setActiveTab(hash);

        const handleHashChange = () => {
            const newHash = window.location.hash.replace("#", "") || "dashboard";
            setActiveTab(newHash);
        };

        window.addEventListener("hashchange", handleHashChange);
        return () => window.removeEventListener("hashchange", handleHashChange);
    }, []);

    // Load agents on mount
    useEffect(() => {
        agents.loadAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        window.location.hash = value;
    };

    // Wrapper handlers that update lastAction
    const handleOrdersUpload = async (files: File[]) => {
        const action = await orders.handleUpload(files);
        if (action) setLastAction(action);
    };

    const handleLiquidazioniImport = async () => {
        const action = await liquidazioni.handleImport();
        if (action) setLastAction(action);
    };

    const handleAgentSave = async (data: Parameters<typeof agents.saveAgent>[0]) => {
        const action = await agents.saveAgent(data);
        if (action) setLastAction(action);
    };

    const handleAgentDelete = async () => {
        const action = await agents.confirmDelete();
        if (action) setLastAction(action);
    };

    const handleCalculate = async () => {
        const action = await calcolo.calculate();
        if (action) setLastAction(action);
    };

    // Dashboard KPIs
    const dashboardKPIs = useMemo(() => {
        const totalAgents = agents.agents.length;
        const totalCommissions = calcolo.result
            ? Object.values(calcolo.result).reduce((sum, v) => sum + v.totale_provvigione, 0)
            : 0;
        const ordersCount = orders.result
            ? orders.result.details.ordini.nuovi + orders.result.details.ordini.aggiornati
            : 0;
        const liquidationsCount = liquidazioni.importedCount;

        return { totalAgents, totalCommissions, ordersCount, liquidationsCount };
    }, [agents.agents, calcolo.result, orders.result, liquidazioni.importedCount]);

    return (
        <TooltipProvider>
            <div className="min-h-screen flex flex-col">
                <AppHeader
                    settings={appSettings.settings}
                    onSettingsChange={appSettings.setSettings}
                    onSettingsSave={appSettings.saveSettings}
                    settingsOpen={appSettings.sheetOpen}
                    onSettingsOpenChange={appSettings.setSheetOpen}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                />

                <main className="flex-1 max-w-[1400px] mx-auto p-8 w-full">
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-10">
                        <TabsContent value="dashboard">
                            <DashboardTab
                                kpis={dashboardKPIs}
                                lastAction={lastAction}
                                onNavigate={handleTabChange}
                            />
                        </TabsContent>

                        <TabsContent value="agenti">
                            <AgentsTab
                                agents={agents.agents}
                                loading={agents.loading}
                                dialogOpen={agents.dialogOpen}
                                onDialogOpenChange={agents.setDialogOpen}
                                editingAgent={agents.editingAgent}
                                saving={agents.saving}
                                deleteDialogOpen={agents.deleteDialogOpen}
                                onDeleteDialogOpenChange={agents.setDeleteDialogOpen}
                                deletingAgent={agents.deletingAgent}
                                onRefresh={agents.loadAgents}
                                onCreateClick={agents.openCreateDialog}
                                onEdit={agents.openEditDialog}
                                onDelete={agents.openDeleteDialog}
                                onSave={handleAgentSave}
                                onConfirmDelete={handleAgentDelete}
                            />
                        </TabsContent>

                        <TabsContent value="ordini">
                            <OrdiniTab
                                ordersImporting={orders.importing}
                                ordersProgress={orders.progress}
                                ordersResult={orders.result}
                                onOrdersUpload={handleOrdersUpload}
                                liquidazioniParsed={liquidazioni.parsed}
                                liquidazioniValid={liquidazioni.valid}
                                liquidazioniInvalid={liquidazioni.invalidCount}
                                liquidazioniImporting={liquidazioni.importing}
                                onLiquidazioniUpload={liquidazioni.handleUpload}
                                onLiquidazioniImport={handleLiquidazioniImport}
                            />
                        </TabsContent>

                        <TabsContent value="provvigioni">
                            <CalcoloTab
                                data={calcolo.data}
                                result={calcolo.result}
                                loading={calcolo.loading}
                                unmatchedAgents={calcolo.unmatchedAgents}
                                onUpload={calcolo.handleUpload}
                                onCalculate={handleCalculate}
                                onNavigate={handleTabChange}
                            />
                        </TabsContent>
                    </Tabs>
                </main>

                <AppFooter lastAction={lastAction} />

                <Toaster />
            </div>
        </TooltipProvider>
    );
}
