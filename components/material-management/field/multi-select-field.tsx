"use client"

import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

interface MultiSelectFieldProps {
    value: string[] | string;
    onChange: (value: string[]) => void;
    options: string[];
    className?: string;
}

export function MultiSelectField({ value, onChange, options, className }: MultiSelectFieldProps) {
    // Convert string[] options to ComboboxOption[]
    const comboboxOptions = options.map((option) => ({
        value: option,
        label: option,
    }));

    // Normalize value to array
    const normalizedValue = Array.isArray(value) ? value : value ? value.split(",") : [];

    // Handle onChange to ensure it always receives an array
    const handleChange = (newValue: string | string[]) => {
        const arrayValue = Array.isArray(newValue) ? newValue : newValue ? [newValue] : [];
        onChange(arrayValue);
    };

    return (
        <div className={cn(className)}>
            <Combobox
                options={comboboxOptions}
                value={normalizedValue}
                onChange={handleChange}
                multiple={true}
                placeholder=""
                emptyMessage="No option found."
            />
        </div>
    )
} 