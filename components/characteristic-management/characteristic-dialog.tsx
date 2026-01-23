"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Pencil, PlusCircle, Trash2, Undo2, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import {
    createCharacteristicAction,
    deleteCharacteristicAction,
    updateCharacteristicAction,
} from "@/actions/characteritic.action"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getTypeColor, handleActionResult } from "@/lib/utils.client"
import { CharacteristicType } from "@/prisma/generated/browser"
import { CharacteristicAndCountMaterial } from "@/types/characteristic.type"

const characteristicTypes: CharacteristicType[] = [
    "boolean",
    "number",
    "float",
    "text",
    "textarea",
    "multiText",
    "multiTextArea",
    "checkbox",
    "select",
    "radio",
    "multiSelect",
    "date",
    "dateHour",
    "dateRange",
    "dateHourRange",
    "email",
    "link",
    "file",
] as const

const createCharacteristicSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    type: z.enum(CharacteristicType),
    options: z.string().optional(),
    units: z.string().optional(),
})

const updateCharacteristicSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    options: z.array(z.string().trim()).optional(),
})

type CreateCharacteristicFormValues = z.infer<typeof createCharacteristicSchema>
type UpdateCharacteristicFormValues = z.infer<typeof updateCharacteristicSchema>

interface CharacteristicDialogProps {
    open: boolean
    characteristic: CharacteristicAndCountMaterial | null
    onClose: (refreshData: boolean) => void
}

export function CharacteristicDialog({ open, characteristic, onClose }: CharacteristicDialogProps) {
    const t = useTranslations("Configuration.characteristics.dialog")
    const tCommon = useTranslations("Common")
    const tTypes = useTranslations("Configuration.characteristics.types")

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [optionItems, setOptionItems] = useState<string[]>([])
    const [originalOptions, setOriginalOptions] = useState<string[]>([])
    const [newlyAddedOptions, setNewlyAddedOptions] = useState<Set<string>>(new Set())
    const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null)
    const [editingOptionValue, setEditingOptionValue] = useState("")
    const [newOption, setNewOption] = useState("")

    const isEditing = !!characteristic
    const canDelete = isEditing && characteristic?._count?.Materials === 0

    const createForm = useForm<CreateCharacteristicFormValues>({
        resolver: zodResolver(createCharacteristicSchema),
        defaultValues: {
            name: "",
            description: "",
            type: "text",
            options: "",
            units: "",
        },
    })

    const updateForm = useForm<UpdateCharacteristicFormValues>({
        resolver: zodResolver(updateCharacteristicSchema),
        defaultValues: {
            name: characteristic?.name || "",
            description: characteristic?.description || "",
            options: [],
        },
    })

    const form = isEditing ? updateForm : createForm

    useEffect(() => {
        if (open && characteristic) {
            const getOptionsArray = () => {
                if (!characteristic?.options) return []

                if (Array.isArray(characteristic.options)) {
                    return characteristic.options as string[]
                }

                // Si c'est un objet JSON ou une autre structure
                try {
                    return [characteristic.options.toString()]
                } catch (e) {
                    return []
                }
            }

            const existingOptions = getOptionsArray()
            updateForm.reset({
                name: characteristic.name,
                description: characteristic.description,
                options: existingOptions,
            })

            setOptionItems(existingOptions)
            setOriginalOptions([...existingOptions]) // Garder une copie des options originales
            setNewlyAddedOptions(new Set()) // Réinitialiser les nouvelles options
            setEditingOptionIndex(null)
            setEditingOptionValue("")
        } else if (open && !characteristic) {
            createForm.reset({
                name: "",
                description: "",
                type: "text",
                options: "",
                units: "",
            })
            setOptionItems([])
            setOriginalOptions([])
            setNewOption("")
            setEditingOptionIndex(null)
            setEditingOptionValue("")
        }
    }, [open, characteristic, updateForm, createForm])

    // Mettre à jour le champ caché du formulaire quand les options changent
    useEffect(() => {
        if (!isEditing && optionItems.length > 0) {
            createForm.setValue("options", optionItems.join(","))
        } else if (!isEditing) {
            createForm.setValue("options", "")
        } else if (isEditing) {
            updateForm.setValue("options", optionItems)
        }
    }, [optionItems, createForm, updateForm, isEditing])

    const handleClose = (refreshData: boolean = false) => {
        form.reset()
        setOptionItems([])
        setOriginalOptions([])
        setNewlyAddedOptions(new Set())
        setNewOption("")
        setEditingOptionIndex(null)
        setEditingOptionValue("")
        onClose(refreshData)
    }

    const addOption = () => {
        if (!newOption.trim()) return

        const trimmedOption = newOption.trim()
        if (!optionItems.includes(trimmedOption)) {
            setOptionItems([...optionItems, trimmedOption])
            // Marquer cette option comme nouvellement ajoutée
            setNewlyAddedOptions((prev) => new Set(prev).add(trimmedOption))
            setNewOption("")
        } else {
            toast.error(t("optionAlreadyExists"))
        }
    }

    const startEditingOption = (index: number) => {
        setEditingOptionIndex(index)
        setEditingOptionValue(optionItems[index])
    }

    const saveEditingOption = () => {
        if (editingOptionIndex === null || !editingOptionValue.trim()) return

        const trimmedValue = editingOptionValue.trim()
        const oldValue = optionItems[editingOptionIndex]

        // Check if the value already exists (except at the current index)
        const existsAtOtherIndex = optionItems.some(
            (opt, idx) => opt === trimmedValue && idx !== editingOptionIndex,
        )

        if (existsAtOtherIndex) {
            toast.error(t("optionAlreadyExists"))
            return
        }

        const newOptions = [...optionItems]
        newOptions[editingOptionIndex] = trimmedValue
        setOptionItems(newOptions)

        // Si l'ancienne valeur était une nouvelle option, mettre à jour le Set
        if (newlyAddedOptions.has(oldValue)) {
            setNewlyAddedOptions((prev) => {
                const newSet = new Set(prev)
                newSet.delete(oldValue)
                if (!originalOptions.includes(trimmedValue)) {
                    newSet.add(trimmedValue)
                }
                return newSet
            })
        } else if (!originalOptions.includes(trimmedValue)) {
            // Si la nouvelle valeur n'est pas dans les originales, c'est une nouvelle option
            setNewlyAddedOptions((prev) => new Set(prev).add(trimmedValue))
        }

        setEditingOptionIndex(null)
        setEditingOptionValue("")
    }

    const cancelEditingOption = () => {
        setEditingOptionIndex(null)
        setEditingOptionValue("")
    }

    const removeNewOption = (index: number) => {
        const optionToRemove = optionItems[index]

        // Vérifier que c'est bien une nouvelle option (ajoutée pendant l'édition)
        if (!newlyAddedOptions.has(optionToRemove)) {
            toast.error(t("cannotRemoveOriginalOption") || "Cannot remove original option")
            return
        }

        const newOptions = [...optionItems]
        newOptions.splice(index, 1)
        setOptionItems(newOptions)

        // Retirer de la liste des nouvelles options
        setNewlyAddedOptions((prev) => {
            const newSet = new Set(prev)
            newSet.delete(optionToRemove)
            return newSet
        })
    }

    // Vérifier si une option est nouvelle (ajoutée pendant l'édition)
    const isNewOption = (option: string) => {
        return newlyAddedOptions.has(option)
    }

    const removeOption = (index: number) => {
        const newOptions = [...optionItems]
        newOptions.splice(index, 1)
        setOptionItems(newOptions)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault()
            addOption()
        }
    }

    const onSubmit = async (values: CreateCharacteristicFormValues | UpdateCharacteristicFormValues) => {
        setIsSubmitting(true)

        try {
            let result
            if (isEditing && characteristic) {
                // Update existing characteristic
                const updateValues = values as UpdateCharacteristicFormValues
                result = await updateCharacteristicAction({
                    id: characteristic.id,
                    name: updateValues.name,
                    description: updateValues.description || "",
                    options: optionItems.length > 0 ? optionItems : null,
                })
            } else {
                // Create new characteristic
                const createValues = values as CreateCharacteristicFormValues

                // Vérifier que les options sont définies si nécessaires
                const selectedType = createValues.type
                const needsOptions = ["select", "radio", "multiSelect", "checkbox"].includes(selectedType)

                if (needsOptions && optionItems.length === 0) {
                    toast.error(t("optionsRequired"))
                    setIsSubmitting(false)
                    return
                }

                result = await createCharacteristicAction({
                    name: createValues.name,
                    description: createValues.description || "",
                    type: createValues.type,
                    options: optionItems.length > 0 ? optionItems : null,
                    units: createValues.units || null,
                })
            }

            //@ts-ignore
            const success = handleActionResult(result, {
                t,
                errorTranslationKey: "error",
                defaultServerErrorMessage: isEditing ? t("updateError") : t("createError"),
                defaultValidationErrorMessage: isEditing ? t("updateError") : t("createError"),
                successMessage: isEditing ? t("updateSuccess") : t("createSuccess"),
            })

            if (success) {
                handleClose(true)
            }
        } catch (error) {
            console.error(error)
            toast.error(isEditing ? t("updateError") : t("createError"))
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!characteristic || !canDelete) return

        try {
            const result = await deleteCharacteristicAction({
                id: characteristic.id,
            })

            const success = handleActionResult(result, {
                t,
                errorTranslationKey: "error",
                defaultServerErrorMessage: t("deleteError"),
                defaultValidationErrorMessage: t("deleteError"),
                successMessage: t("deleteSuccess"),
            })

            if (success) {
                handleClose(true)
            }
        } catch (error) {
            console.error(error)
            toast.error(t("deleteError"))
        }
    }

    const selectedType = createForm.watch("type")
    const needsOptions = ["select", "radio", "multiSelect", "checkbox"].includes(selectedType)
    const needsUnits = ["number", "float"].includes(selectedType)

    return (
        <Dialog
            open={open}
            onOpenChange={handleClose}
        >
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? t("edit") : t("create")}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? t("editDescription") : t("createDescription")}
                    </DialogDescription>
                </DialogHeader>
                {isEditing ? (
                    <Form {...updateForm}>
                        <form
                            onSubmit={updateForm.handleSubmit(onSubmit)}
                            className="space-y-4"
                        >
                            <FormField
                                control={updateForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("name")}</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t("namePlaceholder")}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={updateForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("description")}</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder={t("descriptionPlaceholder")}
                                                className="resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {characteristic && (
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <div className="font-medium">{t("type")}:</div>
                                        <Badge className={getTypeColor(characteristic.type)}>
                                            {tTypes(characteristic.type)}
                                        </Badge>
                                    </div>

                                    {characteristic.options && (
                                        <div className="space-y-2">
                                            <div className="font-medium">{t("options")}:</div>
                                            <div className="bg-muted/40 p-2 rounded-md space-y-2">
                                                {optionItems.map((option: string, index: number) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center gap-2"
                                                    >
                                                        {editingOptionIndex === index ? (
                                                            <>
                                                                <Input
                                                                    value={editingOptionValue}
                                                                    onChange={(e) =>
                                                                        setEditingOptionValue(e.target.value)
                                                                    }
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") {
                                                                            e.preventDefault()
                                                                            saveEditingOption()
                                                                        } else if (e.key === "Escape") {
                                                                            e.preventDefault()
                                                                            cancelEditingOption()
                                                                        }
                                                                    }}
                                                                    className="flex-1"
                                                                    autoFocus
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={saveEditingOption}
                                                                    className="h-8 w-8"
                                                                >
                                                                    <Check />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={cancelEditingOption}
                                                                    className="h-8 w-8"
                                                                >
                                                                    <Undo2 />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Badge
                                                                        variant="secondary"
                                                                        className={`flex-1 py-1 justify-start ${isNewOption(option)
                                                                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700"
                                                                            : ""
                                                                            }`}
                                                                    >
                                                                        {String(option)}
                                                                    </Badge>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => startEditingOption(index)}
                                                                    className="h-8 w-8"
                                                                >
                                                                    <Pencil />
                                                                </Button>
                                                                {isNewOption(option) && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => removeNewOption(index)}
                                                                        className="text-destructive"
                                                                    >
                                                                        <X />
                                                                    </Button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                                <div className="flex space-x-2 pt-2 border-t">
                                                    <Input
                                                        placeholder={t("addOptionPlaceholder")}
                                                        value={newOption}
                                                        onChange={(e) => setNewOption(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault()
                                                                addOption()
                                                            }
                                                        }}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="icon"
                                                        onClick={addOption}
                                                    >
                                                        <PlusCircle className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {characteristic.units && (
                                        <div className="flex items-center space-x-2">
                                            <div className="font-medium">{t("unit")}:</div>
                                            <Badge
                                                variant="secondary"
                                                className="py-1"
                                            >
                                                {String(characteristic.units)}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            )}

                            <DialogFooter className="flex !justify-between">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={handleDelete}
                                                disabled={!canDelete}
                                                className="gap-2 text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                {tCommon("delete")}
                                            </Button>
                                        </div>
                                    </TooltipTrigger>
                                    {!canDelete && characteristic?._count?.Materials > 0 && (
                                        <TooltipContent>
                                            <p>{t("cannotDeleteUsed")}</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleClose()}
                                    >
                                        {tCommon("cancel")}
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? tCommon("saving") : tCommon("update")}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </form>
                    </Form>
                ) : (
                    <Form {...createForm}>
                        <form
                            onSubmit={createForm.handleSubmit(onSubmit)}
                            className="space-y-4"
                        >
                            <FormField
                                control={createForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("name")}</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t("namePlaceholder")}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                        <FormDescription>{t("nameCannotBeChanged")}</FormDescription>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={createForm.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("type")}</FormLabel>
                                        <Select
                                            onValueChange={(value) => {
                                                field.onChange(value)
                                                // Réinitialiser les options si on change pour un type qui n'en a pas besoin
                                                if (
                                                    !["select", "radio", "multiSelect", "checkbox"].includes(value)
                                                ) {
                                                    setOptionItems([])
                                                    createForm.setValue("options", "")
                                                }
                                            }}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("selectType")} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {characteristicTypes.map((type) => (
                                                    <SelectItem
                                                        key={type}
                                                        value={type}
                                                    >
                                                        {tTypes(type)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        <FormDescription>{t("typeCannotBeChanged")}</FormDescription>
                                    </FormItem>
                                )}
                            />

                            {needsOptions && (
                                <div className="space-y-2">
                                    <FormField
                                        control={createForm.control}
                                        name="options"
                                        render={() => (
                                            <FormItem>
                                                <FormLabel>{t("options")}</FormLabel>
                                                <div className="flex space-x-2">
                                                    <Input
                                                        placeholder={t("addOptionPlaceholder")}
                                                        value={newOption}
                                                        onChange={(e) => setNewOption(e.target.value)}
                                                        onKeyDown={handleKeyDown}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="icon"
                                                        onClick={addOption}
                                                    >
                                                        <PlusCircle className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <FormMessage />
                                                <FormDescription>{t("optionsCannotBeChanged")}</FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                    <div className="bg-muted/40 p-2 rounded-md">
                                        <p className="text-sm font-medium mb-2">{t("currentOptions")}:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {optionItems.map((option, index) => (
                                                <Badge
                                                    key={index}
                                                    variant="outline"
                                                    className="flex items-center gap-1 py-1"
                                                >
                                                    {option}
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive"
                                                        onClick={() => removeOption(index)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                        <span className="sr-only">{t("removeOption")}</span>
                                                    </Button>
                                                </Badge>
                                            ))}
                                        </div>
                                        {optionItems.length < 2 && (
                                            <p className="text-sm text-amber-500 mt-2">{t("atLeastTwoOptions")}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                            {needsUnits && (
                                <FormField
                                    control={createForm.control}
                                    name="units"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("unit")}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t("unitPlaceholder")}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                            <FormDescription>{t("unitCannotBeChanged")}</FormDescription>
                                        </FormItem>
                                    )}
                                />
                            )}

                            <FormField
                                control={createForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("description")}</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder={t("descriptionPlaceholder")}
                                                className="resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleClose()}
                                >
                                    {tCommon("cancel")}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || (needsOptions && optionItems.length < 2)}
                                >
                                    {isSubmitting ? tCommon("saving") : tCommon("create")}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    )
}
