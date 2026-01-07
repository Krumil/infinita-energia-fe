import { useState, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/toaster";

// Layout components
import { AppHeader, AppFooter } from "@/components";

// Page components
import { DashboardTab, AgentsTab, OrdiniTab, CalcoloTab } from "@/pages";

// Custom hooks
import { useAppSettings, useAgents, useOrders, useLiquidazioni, useCalcolo, usePendingOrders } from "@/hooks";
import { useAuth } from "@/contexts/AuthContext";

// ========== Main App Component ==========

export default function App() {
    const { isAuthenticated } = useAuth();

    // Don't render anything if not authenticated - prevents data loading
    if (!isAuthenticated) {
        return null;
    }

    return <AuthenticatedApp />;
}

function AuthenticatedApp() {
    // Tab navigation state
    const [activeTab, setActiveTab] = useState<string>("dashboard");

    // Last action for footer (shared state across hooks)
    const [lastAction, setLastAction] = useState<string | null>(null);

    // Custom hooks for state management - only called when authenticated
    const appSettings = useAppSettings();
    const agents = useAgents();
    const orders = useOrders();
    const liquidazioni = useLiquidazioni();
    const calcolo = useCalcolo(agents.agents);
    const pendingOrders = usePendingOrders();

    // Sync activeTab with URL hash
    useEffect(() => {
        const hash = window.location.hash.replace("#", "") || "dashboard";
        setActiveTab(hash);
        if (hash === "ordini") {
            pendingOrders.fetchPendingOrders();
        }

        const handleHashChange = () => {
            const newHash = window.location.hash.replace("#", "") || "dashboard";
            setActiveTab(newHash);
            if (newHash === "ordini") {
                pendingOrders.fetchPendingOrders();
            }
        };

        window.addEventListener("hashchange", handleHashChange);
        return () => window.removeEventListener("hashchange", handleHashChange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        window.location.hash = value;
        if (value === "ordini") {
            pendingOrders.fetchPendingOrders();
        }
    };

    // Wrapper handlers that update lastAction
    const handleOrdersUpload = async (files: File[]) => {
        const action = await orders.handleUpload(files);
        if (action) {
            setLastAction(action);
            await pendingOrders.fetchPendingOrders();
        }
    };

    const handleLiquidazioniUpload = async (files: File[], competenzaPeriod: string) => {
        const action = await liquidazioni.handleUpload(files, competenzaPeriod);
        if (action) {
            setLastAction(action);
            await pendingOrders.fetchPendingOrders();
        }
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

                <main className="flex-1 max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 w-full">
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-10">
                        <TabsContent value="dashboard">
                            <DashboardTab />
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
                                onToggleStatistiche={agents.toggleStatistiche}
                            />
                        </TabsContent>

                        <TabsContent value="ordini">
                            <OrdiniTab
                                ordersImporting={orders.importing}
                                ordersProgress={orders.progress}
                                ordersResult={orders.result}
                                onOrdersUpload={handleOrdersUpload}
                                liquidazioniImporting={liquidazioni.importing}
                                liquidazioniResult={liquidazioni.result}
                                onLiquidazioniUpload={handleLiquidazioniUpload}
                                pendingOrders={pendingOrders.orders}
                                pendingOrdersCount={pendingOrders.count}
                                pendingOrdersLoading={pendingOrders.loading}
                                onRefreshPendingOrders={pendingOrders.fetchPendingOrders}
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
