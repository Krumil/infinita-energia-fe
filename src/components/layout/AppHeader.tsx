import { Settings as SettingsIcon, LayoutDashboard, Users, BookOpen, Receipt, Calculator, FileText, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
    appVersion: string;
    onSettingsSave: () => void;
    settingsOpen: boolean;
    onSettingsOpenChange: (open: boolean) => void;
    activeTab: string;
    onTabChange: (tab: string) => void;
    incompleteRulesCount?: number;
}

const navItems = [
    { id: "dashboard", labelKey: "dashboard", icon: LayoutDashboard },
    { id: "agenti", labelKey: "agenti", icon: Users },
    { id: "regole", labelKey: "regole", icon: BookOpen },
    { id: "ordini", labelKey: "ordini", icon: Receipt },
    { id: "provvigioni", labelKey: "provvigioni", icon: Calculator },
    { id: "inviti", labelKey: "inviti", icon: FileText },
] as const;

export function AppHeader({
    appVersion,
    onSettingsSave,
    settingsOpen,
    onSettingsOpenChange,
    activeTab,
    onTabChange,
    incompleteRulesCount = 0,
}: AppHeaderProps) {
    const { t } = useTranslation();
    const { logout, user } = useAuth();

    return (
        <header className="ledger-header sticky top-0 z-50">
            <div className="max-w-[1600px] mx-auto px-6 lg:px-8">
                <div className="flex items-center justify-between h-[72px]">
                    {/* Brand Section */}
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => onTabChange("dashboard")}>
                        <div className="relative flex-shrink-0">
                            <img src="/logo.png" alt="Infinita Energia" className="h-10 w-10 object-contain" />
                        </div>
                        <div className="header-brand-divider hidden sm:block h-8 w-px" />
                        <span className="header-brand-subtitle font-mono text-[10px] uppercase tracking-[0.2em] sm:hidden">
                            v{appVersion}
                        </span>
                        <div className="hidden sm:flex flex-col justify-center">
                            <h1 className="header-brand-title font-display text-[17px] font-medium tracking-wide leading-tight">
                                {t("appTitle")}
                            </h1>
                            <p className="header-brand-subtitle mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em]">
                                v{appVersion}
                            </p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex items-center gap-1" role="navigation" aria-label="Main navigation">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onTabChange(item.id)}
                                    aria-current={isActive ? "page" : undefined}
                                    className={cn("header-nav-item", isActive && "is-active")}
                                >
                                    <Icon
                                        className={`h-4 w-4 ${isActive ? "text-energia-accent" : "text-current"}`}
                                        strokeWidth={isActive ? 2.25 : 1.75}
                                    />
                                    <span className="hidden md:inline">{t(item.labelKey)}</span>
                                    {item.id === "regole" && incompleteRulesCount > 0 && (
                                        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-[10px] font-bold text-white leading-none">
                                            {incompleteRulesCount}
                                        </span>
                                    )}
                                    {isActive && (
                                        <span className="header-tab-indicator absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" />
                                    )}
                                </button>
                            );
                        })}

                        {/* Divider */}
                        <div className="header-section-divider w-px h-5 mx-2" />

                        {/* Settings */}
                        <Sheet open={settingsOpen} onOpenChange={onSettingsOpenChange}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <SheetTrigger asChild>
                                        <button
                                            className="header-utility-btn group"
                                            aria-label={t("settings")}
                                        >
                                            <SettingsIcon
                                                className="h-[18px] w-[18px] transition-transform duration-300 group-hover:rotate-45"
                                                strokeWidth={1.75}
                                            />
                                        </button>
                                    </SheetTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" sideOffset={8}>
                                    <p>{t("settings")}</p>
                                </TooltipContent>
                            </Tooltip>
                            <SheetContent className="border-l border-energia-accent/20 bg-card">
                                <SheetHeader className="pb-2">
                                    <SheetTitle className="font-display text-xl tracking-wide">
                                        {t("settings")}
                                    </SheetTitle>
                                    <SheetDescription className="font-body text-muted-foreground">
                                        {t("configurePreferences")}
                                    </SheetDescription>
                                </SheetHeader>
                                <Separator className="my-6 bg-border/50" />
                                <SettingsPanel onSave={onSettingsSave} />
                            </SheetContent>
                        </Sheet>

                        {/* Logout */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={logout}
                                    className="header-utility-btn header-utility-btn-danger"
                                    aria-label={t("logout")}
                                >
                                    <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" sideOffset={8}>
                                <p>
                                    {t("logout")} {user && `(${user})`}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </nav>
                </div>
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-energia-accent/50 to-transparent" />
        </header>
    );
}
