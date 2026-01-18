import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FloatFieldProps {
    value: number | string;
    onChange: (value: string) => void;
    units?: string | null;
    className?: string;
    placeholder?: string;
}

export function FloatField({ value, onChange, units, className, placeholder="Enter decimal number" }: FloatFieldProps) {
    return (
        <div className={cn("flex items-center space-x-2", className)}>
            <Input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
            {units && <span className="text-sm text-muted-foreground">{units}</span>}
        </div>
    )
} 