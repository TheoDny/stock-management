import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Plus, X } from "lucide-react"
import { useEffect, useState } from "react"

interface MultiTextFieldProps {
    value: { multiText: { title: string; text: string }[] } | null
    onChange: (value: { multiText: { title: string; text: string }[] }) => void
    className?: string
    useTextArea?: boolean
    titlePlaceholder?: string
    textPlaceholder?: string
}

export function MultiTextField({
    value,
    onChange,
    className,
    useTextArea = false,
    titlePlaceholder = "Enter title",
    textPlaceholder = "Enter content",
}: MultiTextFieldProps) {
    const [items, setItems] = useState<{ title: string; text: string }[]>([{ title: "", text: "" }])

    // Initialize from value prop
    useEffect(() => {
        if (value && value.multiText && Array.isArray(value.multiText)) {
            setItems(value.multiText)
        } else {
            setItems([{ title: "", text: "" }])
        }
    }, [value])

    const handleItemChange = (index: number, field: "title" | "text", newValue: string) => {
        const updatedItems = [...items]
        updatedItems[index] = { ...updatedItems[index], [field]: newValue }
        setItems(updatedItems)
        onChange({ multiText: updatedItems })
    }

    const addItem = () => {
        const updatedItems = [...items, { title: "", text: "" }]
        setItems(updatedItems)
        onChange({ multiText: updatedItems })
    }

    const removeItem = (index: number) => {
        if (items.length <= 1) return
        const updatedItems = items.filter((_, i) => i !== index)
        setItems(updatedItems)
        onChange({ multiText: updatedItems })
    }

    return (
        <div className={cn("space-y-4", className)}>
            {items.map((item, index) => (
                <div
                    key={`multitext-${index}`}
                    className="space-y-2 p-3 border rounded-md relative"
                >
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => removeItem(index)}
                        disabled={items.length <= 1}
                    >
                        <X className="h-4 w-4 text-destructive" />
                    </Button>

                    <div>
                        <Input
                            id={`multitext-title-${index}`}
                            value={item.title}
                            onChange={(e) => handleItemChange(index, "title", e.target.value)}
                            placeholder={titlePlaceholder}
                        />
                    </div>

                    <div>
                        {useTextArea ? (
                            <Textarea
                                id={`multitext-content-${index}`}
                                value={item.text}
                                onChange={(e) => handleItemChange(index, "text", e.target.value)}
                                placeholder={textPlaceholder}
                                className="resize-none"
                            />
                        ) : (
                            <Input
                                id={`multitext-content-${index}`}
                                value={item.text}
                                onChange={(e) => handleItemChange(index, "text", e.target.value)}
                                placeholder={textPlaceholder}
                            />
                        )}
                    </div>
                </div>
            ))}

            <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="w-full"
            >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
            </Button>
        </div>
    )
} 