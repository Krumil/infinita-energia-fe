import { useState, useEffect } from "react";
import { Agentation } from "agentation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/toaster";

// Layout components
import { AppHeader, AppFooter } from "@/components";

// Page components
import { DashboardTab, AgentsTab, RegoleTab, OrdiniTab, CalcoloTab } from "@/pages";

// Custom hooks
import {
    useAppSettings,
    useAgents,
    useRegole,
    useScaglioni,
    useOrders,
    useLiquidazioni,
    useCalcolo,
    usePendingOrders,
    useToast,
    useTranslation,
} from "@/hooks";
import { useAuth } from "@/contexts/AuthContext";

export default function App() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return null;
    }

    return <AuthenticatedApp />;
}

function AuthenticatedApp() {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState<string>("dashboard");
    const [lastAction, setLastAction] = useState<string | null>(null);

    const appSettings = useAppSettings();
    const agents = useAgents();
    const regole = useRegole();
    const scaglioni = useScaglioni();
    const orders = useOrders();
    const liquidazioni = useLiquidazioni();
    const calcolo = useCalcolo(agents.agents);
    const pendingOrders = usePendingOrders();

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

    const handleOrdersUpload = async (files: File[]) => {
        const action = await orders.handleUpload(files);
        if (action) {
            setLastAction(action);
            await pendingOrders.fetchPendingOrders();
        }
    };

    const handleLiquidazioniUpload = async (files: File[], competenzaPeriod: string) => {
        const result = await liquidazioni.handleUpload(files, competenzaPeriod);
        if (result) {
            setLastAction(result.action);

            const refreshes: Promise<void>[] = [pendingOrders.fetchPendingOrders()];
            if (result.hasNewRules) {
                refreshes.push(regole.loadRegole());
            }
            await Promise.all(refreshes);

            if (result.hasNewRules) {
                toast({
                    title: t("newRulesCreated"),
                    description: t("newRulesCreatedDesc"),
                });
            }
        }
    };

    const handleAgentSave = async (...args: Parameters<typeof agents.saveAgent>) => {
        const action = await agents.saveAgent(...args);
        if (action) setLastAction(action);
    };

    const handleAgentDelete = async (agent: Parameters<typeof agents.deleteAgent>[0]) => {
        const action = await agents.deleteAgent(agent);
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
                                deleting={agents.deleting}
                                onRefresh={agents.loadAgents}
                                onCreateClick={agents.openCreateDialog}
                                onEdit={agents.openEditDialog}
                                onSave={handleAgentSave}
                                onDeleteAgent={handleAgentDelete}
                                configurazione={agents.configurazione}
                                configLoading={agents.configLoading}
                            />
                        </TabsContent>

                        <TabsContent value="regole">
                            <RegoleTab
                                regole={regole.regole}
                                loading={regole.loading}
                                importing={regole.importing}
                                onRefresh={regole.loadRegole}
                                onImportRegole={regole.importRegole}
                                onToggleUtilizzato={regole.toggleUtilizzato}
                                onUpdateDefault={regole.updateDefault}
                                onUpdateTipoUtenza={regole.updateTipoUtenza}
                                onUpdateTipoServizio={regole.updateTipoServizio}
                                scaglioni={scaglioni.scaglioni}
                                scaglioniLoading={scaglioni.loading}
                                scaglioniImporting={scaglioni.importing}
                                onRefreshScaglioni={scaglioni.loadScaglioni}
                                onImportScaglioni={scaglioni.importScaglioni}
                                onUpdateScaglioneTipoUtenza={scaglioni.updateTipoUtenza}
                                onUpdateScaglioneTipoServizio={scaglioni.updateTipoServizio}
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
                                startDate={pendingOrders.startDate}
                                endDate={pendingOrders.endDate}
                                onStartDateChange={pendingOrders.setStartDate}
                                onEndDateChange={pendingOrders.setEndDate}
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
                {import.meta.env.DEV && <Agentation />}
            </div>
        </TooltipProvider>
    );
}
