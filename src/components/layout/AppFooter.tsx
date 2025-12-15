import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/hooks/useTranslation";

interface AppFooterProps {
    lastAction: string | null;
}

export function AppFooter({ lastAction }: AppFooterProps) {
    const { t } = useTranslation();

    return (
        <footer className="border-t border-border/30 py-6">
            <div className="max-w-[1400px] mx-auto px-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        {lastAction && (
                            <Tooltip>
                                <TooltipTrigger>
                                    <span className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                                        <div className="w-2 h-2 rounded-full bg-sage" />
                                        {t("lastAction")}: {lastAction}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>{lastAction}</TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                    <span className="font-mono text-xs text-muted-foreground/50 uppercase tracking-wider">
                        {t("version")} 2.0.0
                    </span>
                </div>
            </div>
        </footer>
    );
}
