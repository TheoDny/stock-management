"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { PlusCircle, Trash2, X } from "lucide-react"
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
import { getTypeColor } from "@/lib/utils.client"
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
        },
    })

    const form = isEditing ? updateForm : createForm

    useEffect(() => {
        if (open && characteristic) {
            updateForm.reset({
                name: characteristic.name,
                description: characteristic.description,
            })
        } else if (open && !characteristic) {
            createForm.reset({
                name: "",
                description: "",
                type: "text",
                options: "",
                units: "",
            })
            setOptionItems([])
            setNewOption("")
        }
    }, [open, characteristic, updateForm, createForm])

    // Mettre à jour le champ caché du formulaire quand les options changent
    useEffect(() => {
        if (!isEditing && optionItems.length > 0) {
            createForm.setValue("options", optionItems.join(","))
        } else if (!isEditing) {
            createForm.setValue("options", "")
        }
    }, [optionItems, createForm, isEditing])

    const handleClose = (refreshData: boolean = false) => {
        form.reset()
        setOptionItems([])
        setNewOption("")
        onClose(refreshData)
    }

    const addOption = () => {
        if (!newOption.trim()) return

        if (!optionItems.includes(newOption.trim())) {
            setOptionItems([...optionItems, newOption.trim()])
            setNewOption("")
        } else {
            toast.error(t("optionAlreadyExists"))
        }
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
            if (isEditing && characteristic) {
                // Update existing characteristic
                const updateValues = values as UpdateCharacteristicFormValues
                const result = await updateCharacteristicAction({
                    id: characteristic.id,
                    name: updateValues.name,
                    description: updateValues.description || "",
                })

                if (result?.serverError) {
                    console.error(result?.serverError)
                    return toast.error("Failed to update characteristic")
                } else if (result?.validationErrors) {
                    console.error(result?.validationErrors)
                    return toast.error("Failed to update characteristic")
                } else if (!result?.data) {
                    console.error("No data returned")
                    return toast.error("Failed to update characteristic")
                }

                toast.success(t("updateSuccess"))
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

                await createCharacteristicAction({
                    name: createValues.name,
                    description: createValues.description || "",
                    type: createValues.type,
                    options: optionItems.length > 0 ? optionItems : null,
                    units: createValues.units || null,
                })
                toast.success(t("createSuccess"))
            }

            handleClose(true)
        } catch (error) {
            console.error(error)
            toast.error(isEditing ? t("updateError") : t("createError"))
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!characteristic || !canDelete) return

        const result = await deleteCharacteristicAction({
            id: characteristic.id,
        })

        if (result?.serverError) {
            console.error(result?.serverError)
            return toast.error("Failed to delete characteristic")
        } else if (result?.validationErrors) {
            console.error(result?.validationErrors)
            return toast.error("Failed to delete characteristic")
        } else if (!result?.data) {
            console.error("No data returned")
            return toast.error("Failed to delete characteristic")
        }
        toast.success(t("deleteSuccess"))
        handleClose(true)
    }

    const selectedType = createForm.watch("type")
    const needsOptions = ["select", "radio", "multiSelect", "checkbox"].includes(selectedType)
    const needsUnits = ["number", "float"].includes(selectedType)

    // Conversion des options en tableau de chaînes pour l'affichage
    const getOptionsArray = () => {
        if (!characteristic?.options) return []

        if (Array.isArray(characteristic.options)) {
            return characteristic.options
        }

        // Si c'est un objet JSON ou une autre structure
        try {
            return [characteristic.options.toString()]
        } catch (e) {
            return []
        }
    }

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
                                        <div className="space-y-1">
                                            <div className="font-medium">{t("options")}:</div>
                                            <div className="flex flex-wrap gap-2">
                                                {getOptionsArray().map((option, index) => (
                                                    <Badge
                                                        key={index}
                                                        variant="secondary"
                                                        className="py-1"
                                                    >
                                                        {String(option)}
                                                    </Badge>
                                                ))}
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
