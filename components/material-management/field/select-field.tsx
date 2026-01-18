import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SelectFieldProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    className?: string;
    placeholder?: string;
}

export function SelectField({ value, onChange, options, className, placeholder="Select an option" }: SelectFieldProps) {
    return (
        <div className={cn(className)}>
            <Select
                value={value || ""}
                onValueChange={onChange}
            >
                <SelectTrigger>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options?.map((option: string) => (
                        <SelectItem
                            key={option}
                            value={option}
                        >
                            {option}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
} 