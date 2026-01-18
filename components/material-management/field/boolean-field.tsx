import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useId } from "react";

interface BooleanFieldProps {
    value: boolean | string;
    onChange: (value: boolean) => void;
    className?: string;
    label?: string;
}

export function BooleanField({ value, onChange, className, label="Yes" }: BooleanFieldProps) {
    const id = useId();
    
    return (
        <div className={cn("flex items-center space-x-2", className)}>
            <Switch
                checked={value === true || value === "true"}
                onCheckedChange={(checked) => onChange(checked ? true : false)}
                id={id}
            />
            <Label htmlFor={id}>{label}</Label>
        </div>
    )
} 