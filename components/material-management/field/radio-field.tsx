import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useId } from "react";

interface RadioFieldProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    className?: string;
}

export function RadioField({ value, onChange, options, className }: RadioFieldProps) {
    const baseId = useId();
    
    return (
        <div className={cn(className)}>
            <RadioGroup
                value={value || ""}
                onValueChange={onChange}
                className="flex flex-col space-y-1"
            >
                {options?.map((option: string) => (
                    <div
                        key={option}
                        className="flex items-center space-x-2"
                    >
                        <RadioGroupItem
                            value={option}
                            id={`${baseId}-${option}`}
                        />
                        <Label htmlFor={`${baseId}-${option}`}>{option}</Label>
                    </div>
                ))}
            </RadioGroup>
        </div>
    )
} 