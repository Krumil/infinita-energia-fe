import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function InputGroup({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element {
    return (
        <div
            role="group"
            data-slot="input-group"
            className={cn("relative flex h-10 w-full items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", className)}
            {...props}
        />
    );
}

interface InputGroupAddonProps extends React.ComponentProps<"div"> {
    align?: "inline-start" | "inline-end";
}

function InputGroupAddon({ className, align = "inline-start", ...props }: InputGroupAddonProps): React.JSX.Element {
    return (
        <div
            data-slot="input-group-addon"
            data-align={align}
            className={cn("flex shrink-0 select-none items-center text-sm text-muted-foreground", align === "inline-start" ? "order-first pl-3" : "order-last pr-3", className)}
            {...props}
        />
    );
}

function InputGroupInput({ className, ...props }: React.ComponentProps<typeof Input>): React.JSX.Element {
    return (
        <Input
            data-slot="input-group-control"
            className={cn("h-full min-w-0 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0", className)}
            {...props}
        />
    );
}

export { InputGroup, InputGroupAddon, InputGroupInput };
