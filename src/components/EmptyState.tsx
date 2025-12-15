import { AlertCircle } from "lucide-react";
import type { EmptyStateProps } from "@/types/components";

export function EmptyState({ message, icon }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-muted-foreground/30 mb-6">{icon || <AlertCircle className="h-16 w-16" />}</div>
            <p className="font-display text-lg text-muted-foreground italic">{message}</p>
        </div>
    );
}
