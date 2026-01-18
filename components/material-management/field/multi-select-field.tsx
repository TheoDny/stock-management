import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useId } from "react";

interface MultiSelectFieldProps {
    value: string[] | string;
    onChange: (value: string[]) => void;
    options: string[];
    className?: string;
}

export function MultiSelectField({ value, onChange, options, className }: MultiSelectFieldProps) {
    const baseId = useId();
    const selectedValues = Array.isArray(value) ? value : value ? value.split(",") : [];
    
    return (
        <div className={cn("space-y-2", className)}>
            {options?.map((option: string) => (
                <div
                    key={option}
                    className="flex items-center space-x-2"
                >
                    <Checkbox
                        checked={selectedValues.includes(option)}
                        onCheckedChange={(checked) => {
                            let newValues;
                            if (checked) {
                                newValues = [...selectedValues, option];
                            } else {
                                newValues = selectedValues.filter((v: string) => v !== option);
                            }
                            onChange(newValues);
                        }}
                        id={`${baseId}-${option}`}
                    />
                    <Label htmlFor={`${baseId}-${option}`}>{option}</Label>
                </div>
            ))}
        </div>
    )
} 