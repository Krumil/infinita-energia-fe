import { useState, useEffect, useMemo } from "react";
import { Agentation } from "agentation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/toaster";

// Layout components
import { AppHeader } from "@/components";

// Page components
import { DashboardTab, AgentsTab, RulesTab, OrdersTab, CalculationTab, InvoiceRequestsTab } from "@/pages";

// Custom hooks
import {
    useAgents,
    useRules,
    useTiers,
    useOrders,
    useSettlements,
    useCalculation,
    usePendingOrders,
    useToast,
    useTranslation,
} from "@/hooks";
import { useAuth } from "@/hooks/useAuth";

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

    const [settingsOpen, setSettingsOpen] = useState(false);
    const agents = useAgents();
    const rules = useRules();
    const tiers = useTiers();
    const orders = useOrders();
    const calculation = useCalculation();
    const pendingOrders = usePendingOrders();

    const settlements = useSettlements({
        onSourceChanged: (month) => {
            calculation.invalidateMonth(month);
            void pendingOrders.refreshOrders().catch(() => {
                toast({ title: t("error"), description: t("fetchError"), variant: "destructive" });
            });
        },
        onImported: (hasNewRules) => {
            if (!hasNewRules) return;
            void rules.loadRules().catch(() => {
                toast({ title: t("error"), description: t("fetchError"), variant: "destructive" });
            });
            toast({ title: t("newRulesCreated"), description: t("newRulesCreatedDesc") });
        },
    });

    const incompleteRulesCount = useMemo(
        () =>
            rules.rules.filter((r) => r.tipo_utenza === null).length +
            tiers.tiers.filter((s) => s.tipo_utenza === null).length,
        [rules.rules, tiers.tiers],
    );

    useEffect(() => {
        const hash = window.location.hash.replace("#", "") || "dashboard";
        setActiveTab(hash);

        if (hash === "ordini") {
            pendingOrders.refreshOrders();
        }

        const handleHashChange = () => {
            const newHash = window.location.hash.replace("#", "") || "dashboard";
            setActiveTab(newHash);

            if (newHash === "ordini") {
                pendingOrders.refreshOrders();
            }
        };

        window.addEventListener("hashchange", handleHashChange);

        return () => window.removeEventListener("hashchange", handleHashChange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleTabChange = (value: string) => {
        setActiveTab(value);

        if (window.location.hash !== `#${value}`) window.location.hash = value;
    };

    const handleOrdersUpload = async (files: File[]) => {
        const action = await orders.handleUpload(files);

        if (action) {
            await pendingOrders.refreshOrders();
        }
    };

    return (
        <TooltipProvider>
            <div className="min-h-screen flex flex-col">
                <AppHeader
                    appVersion={__APP_VERSION__}
                    settingsOpen={settingsOpen}
                    onSettingsOpenChange={setSettingsOpen}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    incompleteRulesCount={incompleteRulesCount}
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
                                onToggleStatistics={agents.toggleStatistics}
                                onSave={agents.saveAgent}
                                onDeleteAgent={agents.deleteAgent}
                                rules={rules.rules}
                                configuration={agents.configuration}
                                configLoading={agents.configLoading}
                                tiers={tiers.tiers}
                            />
                        </TabsContent>

                        <TabsContent value="regole">
                            <RulesTab
                                rules={rules.rules}
                                loading={rules.loading}
                                importing={rules.importing}
                                onRefresh={rules.loadRules}
                                onImportRules={rules.importRules}
                                onToggleEnabled={rules.toggleEnabled}
                                onUpdateDefault={rules.updateDefault}
                                onUpdateCustomerType={rules.updateCustomerType}
                                onUpdateServiceType={rules.updateServiceType}
                                tiers={tiers.tiers}
                                tiersLoading={tiers.loading}
                                tiersImporting={tiers.importing}
                                onRefreshTiers={tiers.loadTiers}
                                onImportTiers={tiers.importTiers}
                                onUpdateTierCustomerType={tiers.updateCustomerType}
                                onUpdateTierServiceType={tiers.updateServiceType}
                            />
                        </TabsContent>

                        <TabsContent value="ordini">
                            <OrdersTab
                                ordersImporting={orders.importing}
                                ordersProgress={orders.progress}
                                ordersResult={orders.result}
                                onOrdersUpload={handleOrdersUpload}
                                settlements={settlements}
                                pendingOrders={pendingOrders.orders}
                                pendingOrdersLoading={pendingOrders.loading}
                                pendingOrdersError={pendingOrders.error}
                                excludedOrders={pendingOrders.excludedOrders}
                                excludedOrdersCount={pendingOrders.excludedCount}
                                excludedOrdersLoading={pendingOrders.excludedLoading}
                                excludedOrdersError={pendingOrders.excludedError}
                                mutatingRowId={pendingOrders.mutatingRowId}
                                mutationError={pendingOrders.mutationError}
                                onRefreshOrders={pendingOrders.refreshOrders}
                                onExcludeOrder={pendingOrders.excludeOrder}
                                onRestoreOrder={pendingOrders.restoreOrder}
                                startDate={pendingOrders.startDate}
                                endDate={pendingOrders.endDate}
                                onStartDateChange={pendingOrders.setStartDate}
                                onEndDateChange={pendingOrders.setEndDate}
                            />
                        </TabsContent>

                        <TabsContent value="provvigioni">
                            <CalculationTab
                                month={calculation.month}
                                preview={calculation.preview}
                                agents={agents.agents}
                                onMonthChange={calculation.selectMonth}
                                onPreview={calculation.requestPreview}
                                onNavigate={handleTabChange}
                            />
                        </TabsContent>

                        <TabsContent value="inviti">
                            <InvoiceRequestsTab
                                agents={agents.agents}
                                agentsLoading={agents.loading}
                            />
                        </TabsContent>
                    </Tabs>
                </main>

                <Toaster />
                {import.meta.env.DEV && <Agentation />}
            </div>
        </TooltipProvider>
    );
}
