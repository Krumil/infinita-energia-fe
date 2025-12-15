import type { KPICardProps } from "@/types/components";

export function KPICard({ title, value, icon, description, delay = 0 }: KPICardProps) {
    return (
        <div
            className="kpi-card p-6 opacity-0 animate-fade-up"
            style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
        >
            <div className="flex items-start justify-between mb-4">
                <span className="kpi-label">{title}</span>
                <div className="text-energia-accent/60">{icon}</div>
            </div>
            <div className="kpi-value">{value}</div>
            {description && <p className="font-body text-sm text-muted-foreground mt-3 italic">{description}</p>}
        </div>
    );
}
