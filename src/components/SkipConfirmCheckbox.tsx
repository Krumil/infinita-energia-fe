import { useId, type ReactElement } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/hooks/useTranslation";
import type { ConfirmSkip } from "@/hooks/useConfirmSkip";

export function SkipConfirmCheckbox({ skip }: { skip: ConfirmSkip }): ReactElement {
    const { t } = useTranslation();
    const id = useId();

    return (
        <div className="flex items-center gap-2">
            <Checkbox id={id} checked={skip.checked} onCheckedChange={(checked) => skip.setChecked(checked === true)} />
            <Label htmlFor={id} className="text-sm font-normal text-muted-foreground">
                {t("dontShowAgain")}
            </Label>
        </div>
    );
}
