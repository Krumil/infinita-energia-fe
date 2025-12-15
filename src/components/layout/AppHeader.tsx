import { Settings as SettingsIcon, LayoutDashboard, Users, Receipt, Calculator } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SettingsPanel } from "@/components";
import { useTranslation } from "@/hooks/useTranslation";
import type { AppSettings } from "@/types";

interface AppHeaderProps {
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
    onSettingsSave: () => void;
    settingsOpen: boolean;
    onSettingsOpenChange: (open: boolean) => void;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const navItems = [
    { id: "dashboard", labelKey: "dashboard", icon: LayoutDashboard },
    { id: "agenti", labelKey: "agenti", icon: Users },
    { id: "ordini", labelKey: "ordini", icon: Receipt },
    { id: "calcolo", labelKey: "calcolo", icon: Calculator },
] as const;

export function AppHeader({
    settings,
    onSettingsChange,
    onSettingsSave,
    settingsOpen,
    onSettingsOpenChange,
    activeTab,
    onTabChange,
}: AppHeaderProps) {
    const { t } = useTranslation();

    return (
        <header className="ledger-header sticky top-0 z-50">
            <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
                <div className="flex items-center justify-between h-[72px]">
                    {/* Brand Section */}
                    <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                            <img
                                src="/logo.png"
                                alt="Infinita Energia"
                                className="h-10 w-10 object-contain"
                            />
                        </div>
                        <div className="hidden sm:block h-8 w-px bg-white/15" />
                        <div className="hidden sm:flex flex-col justify-center">
                            <h1 className="font-display text-[17px] font-medium tracking-wide text-white leading-tight">
                                {t("appTitle")}
                            </h1>
                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50 mt-0.5">
                                Sistema Provvigionale
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
                                    className={`
                                        relative flex items-center gap-2.5 px-4 py-2.5
                                        font-display text-[13px] tracking-[0.04em] uppercase
                                        rounded-md transition-all duration-200
                                        ${isActive
                                            ? "bg-white/[0.12] text-white"
                                            : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                                        }
                                    `}
                                >
                                    <Icon
                                        className={`h-4 w-4 ${isActive ? "text-energia-accent" : "text-current"}`}
                                        strokeWidth={isActive ? 2.25 : 1.75}
                                    />
                                    <span className="hidden md:inline">{t(item.labelKey)}</span>
                                    {isActive && (
                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-energia-accent rounded-full" />
                                    )}
                                </button>
                            );
                        })}

                        {/* Divider */}
                        <div className="w-px h-5 mx-2 bg-white/10" />

                        {/* Settings */}
                        <Sheet open={settingsOpen} onOpenChange={onSettingsOpenChange}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <SheetTrigger asChild>
                                        <button
                                            className="
                                                flex items-center justify-center
                                                w-10 h-10 rounded-md
                                                text-white/60 hover:text-white
                                                hover:bg-white/[0.06]
                                                transition-all duration-200
                                                group
                                            "
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
                                    <SheetTitle className="font-display text-xl tracking-wide">{t("settings")}</SheetTitle>
                                    <SheetDescription className="font-body text-muted-foreground">
                                        {t("configurePreferences")}
                                    </SheetDescription>
                                </SheetHeader>
                                <Separator className="my-6 bg-border/50" />
                                <SettingsPanel settings={settings} onChange={onSettingsChange} onSave={onSettingsSave} />
                            </SheetContent>
                        </Sheet>
                    </nav>
                </div>
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-energia-accent/50 to-transparent" />
        </header>
    );
}
