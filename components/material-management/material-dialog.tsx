"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import "dotenv/config"
import { Check, GripVertical, X } from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { getCharacteristicsAction } from "@/actions/characteritic.action"
import {
    createMaterialAction,
    getMaterialCharacteristicsAction,
    updateMaterialAction,
} from "@/actions/material.actions"
import { getTagsAction } from "@/actions/tag.action"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
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
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { normalizeDate } from "@/lib/utils"
import {
    buildCharacteristicDefaultValue,
    handleActionResult,
    isCharacteristicValueFile,
    isCharacteristicValueFileClient,
} from "@/lib/utils.client"
import { Characteristic, Tag } from "@/prisma/generated/browser"
import { MaterialCharacteristicClient } from "@/types/characteristic.type"
import { MaterialWithTag } from "@/types/material.type"
import { useTranslations } from "next-intl"
import { MemoizedCharacteristicValueForm } from "./characteristic-value-form"

const materialSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    tagIds: z.array(z.string()),
    orderCharacteristics: z.array(z.string()),
})

type MaterialFormValues = z.infer<typeof materialSchema>

interface MaterialDialogProps {
    open: boolean
    material: MaterialWithTag | null
    onClose: (refreshData: boolean) => void
}

export function MaterialDialog({ open, material, onClose }: MaterialDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [tags, setTags] = useState<Tag[]>([])
    const [characteristics, setCharacteristics] = useState<Characteristic[]>([])
    const [characteristicValues, setCharacteristicValues] = useState<MaterialCharacteristicClient[]>([])
    const [activeTab, setActiveTab] = useState("general")
    const [selectedCharacteristicId, setSelectedCharacteristicId] = useState<string>("")
    const tCommon = useTranslations("Common")
    const tMaterialDialog = useTranslations("Materials.dialog")
    const tMaterials = useTranslations("Materials")

    const isEditing = !!material
    const draggedItemIndexRef = useRef<number | null>(null)

    const form = useForm<MaterialFormValues>({
        resolver: zodResolver(materialSchema),
        defaultValues: {
            name: material?.name || "",
            description: material?.description || "",
            tagIds: material?.Tags.map((tag) => tag.id) || [],
            orderCharacteristics: material?.order_Material_Characteristic || [],
        },
    })

    // Subscribes to ordering changes so drag-and-drop updates the UI without forcing rerenders via extra state.
    const orderCharacteristics = useWatch({
        control: form.control,
        name: "orderCharacteristics",
    })

    useEffect(() => {
        if (open) {
            const loadCharacteristics = async () => {
            try {
                const characteristicsData = await getCharacteristicsAction()
                setCharacteristics(characteristicsData)
            } catch (error) {
                console.error(error)
                toast.error(tMaterials("errors.loadCharacteristicsFailed"))
            }
            }

            const loadTags = async () => {
                try {
                    const tagsData = await getTagsAction()
                    setTags(tagsData)
                } catch (error) {
                    console.error(error)
                    toast.error(tMaterials("errors.loadTagsFailed"))
                }
            }

            const loadMaterialCharacteristics = async (materialId: string) => {
                try {
                    const values = await getMaterialCharacteristicsAction(materialId)

                    // Process file relationships into the proper format for the form
                    const processedValues: MaterialCharacteristicClient[] = values.map((cv) => {
                        if (isCharacteristicValueFile(cv)) {
                            return {
                                ...cv,
                                value: {
                                    fileToAdd: [],
                                    fileToDelete: [],
                                    file: cv.File
                                        ? cv.File.map((file) => ({
                                            id: file.id,
                                            name: file.name,
                                            type: file.type,
                                        }))
                                        : [],
                                },
                            }
                        }

                        return cv
                    })

                    setCharacteristicValues(processedValues)
                } catch (error) {
                    console.error(error)
                    toast.error(tMaterials("errors.loadMaterialCharacteristicsFailed"))
                }
            }

            loadTags()
            loadCharacteristics()

            if (material) {
                form.reset({
                    name: material.name,
                    description: material.description,
                    tagIds: material.Tags.map((tag) => tag.id),
                    orderCharacteristics: material.order_Material_Characteristic || [],
                })

                loadMaterialCharacteristics(material.id)
            } else {
                form.reset({
                    name: "",
                    description: "",
                    tagIds: [],
                    orderCharacteristics: [],
                })
                setCharacteristicValues([])
            }
        }
    }, [open, material, form, tMaterials])

    // Update the order whenever characteristic values change
    useEffect(() => {
        const currentOrder = form.getValues("orderCharacteristics")
        const characteristicIds = characteristicValues.map((cv) => cv.characteristicId)

        // Add any new characteristic IDs to the order
        const newIds = characteristicIds.filter((id) => !currentOrder.includes(id))

        // Remove any IDs from the order that are no longer in the values
        const updatedOrder = currentOrder.filter((id) => characteristicIds.includes(id)).concat(newIds)

        form.setValue("orderCharacteristics", updatedOrder)
    }, [characteristicValues, form])

    const handleClose = (refreshData: boolean = false) => {
        form.reset()
        setActiveTab("general")
        onClose(refreshData)
    }

    const onSubmit = async (values: MaterialFormValues) => {
        setIsSubmitting(true)
        try {
            if (isEditing && material) {
                let processedCharacteristicValues = characteristicValues.map((cv) => {
                    // If it's a file characteristic, ensure it's in the proper format for saving
                    if (isCharacteristicValueFileClient(cv)) {
                        // For editing, need fileToAdd and fileToDelete format
                        const value = cv.value || {}
                        return {
                            characteristicId: cv.characteristicId,
                            value: {
                                fileToAdd: Array.isArray(value.fileToAdd) ? value.fileToAdd : [],
                                fileToDelete: Array.isArray(value.fileToDelete) ? value.fileToDelete : [],
                            },
                        }
                    }

                    // Handle date types
                    if (cv.Characteristic.type === "date" || cv.Characteristic.type === "dateHour") {
                        // Ensure date is in the correct format for server action validation (Date instance)
                        const date = (
                            cv.value && typeof cv.value === "object" && "date" in cv.value
                                ? normalizeDate((cv.value as { date?: unknown }).date)
                                : null
                        )
                        return {
                            characteristicId: cv.characteristicId,
                            value: date ? { date } : null,
                        }
                    }

                    // Handle date range types
                    if (cv.Characteristic.type === "dateRange" || cv.Characteristic.type === "dateHourRange") {
                        // Ensure dateRange is in the correct format for server action validation (Date instances)
                        const from = (
                            cv.value && typeof cv.value === "object" && "from" in cv.value
                                ? normalizeDate((cv.value as { from?: unknown }).from)
                                : null
                        )
                        const to = (
                            cv.value && typeof cv.value === "object" && "to" in cv.value
                                ? normalizeDate((cv.value as { to?: unknown }).to)
                                : null
                        )
                        return {
                            characteristicId: cv.characteristicId,
                            value:
                                cv.value && typeof cv.value === "object" && "from" in cv.value && "to" in cv.value && from && to
                                    ? { from, to }
                                    : null,
                        }
                    }

                    // Handle boolean values
                    if (cv.Characteristic.type === "boolean") {
                        return {
                            characteristicId: cv.characteristicId,
                            value: cv.value === true || cv.value === "true",
                        }
                    }

                    if (cv.Characteristic.type === "checkbox") {
                        return {
                            characteristicId: cv.characteristicId,
                            value: Array.isArray(cv.value) ? cv.value.map((value: string) => value) : [],
                        }
                    }


                    // For non-file types, just pass the value as is
                    return {
                        characteristicId: cv.characteristicId,
                        value: cv.value,
                    }
                })
                if (process.env.NEXT_PUBLIC_STORAGE_ENABLED !== "true") {
                    processedCharacteristicValues = processedCharacteristicValues.filter((cv) => {
                        // Filter out file characteristics when storage is disabled
                        if (cv.value && typeof cv.value === "object" && ("fileToAdd" in cv.value)) {
                            return false
                        }
                        return true
                    })
                    values.orderCharacteristics = values.orderCharacteristics.filter((id) => processedCharacteristicValues.some(cv => cv.characteristicId === id))
                }
                // Update existing material
                const result = await updateMaterialAction({
                    id: material.id,
                    name: values.name,
                    description: values.description || "",
                    tagIds: values.tagIds,
                    orderCharacteristics: values.orderCharacteristics,
                    characteristicValues: processedCharacteristicValues,
                })

                // @ts-ignore
                const success = handleActionResult(result, {
                    t: tMaterialDialog,
                    errorTranslationKey: "error",
                    defaultServerErrorMessage: tMaterials("errors.updateFailed"),
                    defaultValidationErrorMessage: tMaterials("errors.updateFailed"),
                    successMessage: tMaterials("success.updateSuccess"),
                })

                if (!success) {
                    return
                }
            } else {
                let processedCharacteristicValues = characteristicValues.map((cv) => {
                    // If it's a file characteristic, ensure it's in the proper format for saving
                    if (isCharacteristicValueFileClient(cv)) {
                        // For creating, we only need fileToAdd
                        const value = cv.value || {}
                        return {
                            characteristicId: cv.characteristicId,
                            value: {
                                fileToAdd: Array.isArray(value.fileToAdd) ? value.fileToAdd : [],
                            },
                        }
                    }

                    // Handle date types
                    if (cv.Characteristic.type === "date" || cv.Characteristic.type === "dateHour") {
                        // Ensure date is in the correct format for server action validation (Date instance)
                        const date = (
                            cv.value && typeof cv.value === "object" && "date" in cv.value
                                ? normalizeDate((cv.value as { date?: unknown }).date)
                                : null
                        )
                        return {
                            characteristicId: cv.characteristicId,
                            value: date ? { date } : null,
                        }
                    }

                    // Handle date range types
                    if (cv.Characteristic.type === "dateRange" || cv.Characteristic.type === "dateHourRange") {
                        // Ensure dateRange is in the correct format for server action validation (Date instances)
                        const from = (
                            cv.value && typeof cv.value === "object" && "from" in cv.value
                                ? normalizeDate((cv.value as { from?: unknown }).from)
                                : null
                        )
                        const to = (
                            cv.value && typeof cv.value === "object" && "to" in cv.value
                                ? normalizeDate((cv.value as { to?: unknown }).to)
                                : null
                        )
                        return {
                            characteristicId: cv.characteristicId,
                            value:
                                cv.value && typeof cv.value === "object" && "from" in cv.value && "to" in cv.value && from && to
                                    ? { from, to }
                                    : null,
                        }
                    }

                    // Handle boolean values
                    if (cv.Characteristic.type === "boolean") {
                        return {
                            characteristicId: cv.characteristicId,
                            value: cv.value === true || cv.value === "true",
                        }
                    }

                    // For non-file types, just pass the value as is
                    return {
                        characteristicId: cv.characteristicId,
                        value: cv.value,
                    }
                })

                if (process.env.NEXT_PUBLIC_STORAGE_ENABLED !== "true") {
                    processedCharacteristicValues = processedCharacteristicValues.filter((cv) => {
                        // Filter out file characteristics when storage is disabled
                        if (cv.value && typeof cv.value === "object" && "fileToAdd" in cv.value) {
                            return false
                        }
                        return true
                    })
                    values.orderCharacteristics = values.orderCharacteristics.filter((id) => processedCharacteristicValues.some(cv => cv.characteristicId === id))
                }

                // Create new material
                const result = await createMaterialAction({
                    name: values.name,
                    description: values.description || "",
                    tagIds: values.tagIds,
                    orderCharacteristics: values.orderCharacteristics,
                    characteristicValues: processedCharacteristicValues,
                })
                // @ts-ignore
                const success = handleActionResult(result, {
                    t: tMaterialDialog,
                    errorTranslationKey: "error",
                    defaultServerErrorMessage: tMaterials("errors.createFailed"),
                    defaultValidationErrorMessage: tMaterials("errors.createFailed"),
                    successMessage: tMaterials("success.createSuccess"),
                })

                if (!success) {
                    return
                }
            }

            handleClose(true)
        } catch (error) {
            console.error(error)
            toast.error(isEditing ? tMaterials("errors.updateFailed") : tMaterials("errors.createFailed"))
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleTagToggle = (tagId: string) => {
        const currentTagIds = form.getValues("tagIds")

        if (currentTagIds.includes(tagId)) {
            form.setValue(
                "tagIds",
                currentTagIds.filter((id) => id !== tagId),
            )
        } else {
            form.setValue("tagIds", [...currentTagIds, tagId])
        }
    }

    const handleAddCharacteristic = useCallback((characteristicId: string | string[]) => {
        const id = Array.isArray(characteristicId) ? characteristicId[0] : characteristicId
        
        if (!id) {
            return
        }

        // Find characteristic by name
        const characteristic = characteristics.find((c) => c.id === id)

        if (!characteristic) {
            setSelectedCharacteristicId("")
            return
        }

        const newValueCharacteristic = buildCharacteristicDefaultValue(characteristic)

        setCharacteristicValues((prev) => {
            // Check if already added (avoid stale closure + unnecessary re-render)
            if (prev.some((cv) => cv.characteristicId === characteristic.id)) {
                return prev
            }
            return [...prev, newValueCharacteristic]
        })

        // Add to the order list
        const currentOrder = form.getValues("orderCharacteristics")
        if (!currentOrder.includes(characteristic.id)) {
            form.setValue("orderCharacteristics", [...currentOrder, characteristic.id])
        }

        setSelectedCharacteristicId("")
    }, [characteristics, form])

    const handleRemoveCharacteristic = useCallback((characteristicId: string) => {
        setCharacteristicValues((prev) => prev.filter((cv) => cv.characteristicId !== characteristicId))

        // Remove from the order list
        const currentOrder = form.getValues("orderCharacteristics")
        form.setValue(
            "orderCharacteristics",
            currentOrder.filter((id) => id !== characteristicId),
        )
    }, [form])

    const handleCharacteristicValueChange = useCallback((characteristicId: string, value: any) => {
        setCharacteristicValues((prev) =>
            prev.map((cv) => (cv.characteristicId === characteristicId ? { ...cv, value } : cv)),
        )
    }, [])

    const availableCharacteristics = useMemo(() => {
        const selected = new Set(characteristicValues.map((cv) => cv.characteristicId))
        return characteristics.filter((c) => !selected.has(c.id))
    }, [characteristics, characteristicValues])

    // Get ordered characteristic values based on the current order
    const orderedCharacteristicValues = useMemo(() => {
        const order = orderCharacteristics || []
        const orderIndex = new Map<string, number>(order.map((id, idx) => [id, idx]))

        return [...characteristicValues].sort((a, b) => {
            const aIndex = orderIndex.get(a.characteristicId)
            const bIndex = orderIndex.get(b.characteristicId)

            if (aIndex === undefined && bIndex === undefined) return 0
            if (aIndex === undefined) return 1
            if (bIndex === undefined) return -1
            return aIndex - bIndex
        })
    }, [characteristicValues, orderCharacteristics])

    // Drag and drop handlers
    const handleDragStart = useCallback((index: number) => {
        draggedItemIndexRef.current = index
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault()
        const draggedIndex = draggedItemIndexRef.current
        if (draggedIndex === null || draggedIndex === index) return

        // Reorder the characteristics
        const orderedValues = orderedCharacteristicValues
        const order = form.getValues("orderCharacteristics")

        // Get the item being dragged and the target position
        const draggedItem = orderedValues[draggedIndex]

        // Create new order by moving the dragged item
        const newOrder = [...order]
        const fromIndex = newOrder.indexOf(draggedItem.characteristicId)
        const toIndex = newOrder.indexOf(orderedValues[index].characteristicId)

        if (fromIndex !== -1 && toIndex !== -1) {
            newOrder.splice(fromIndex, 1)
            newOrder.splice(toIndex, 0, draggedItem.characteristicId)
            form.setValue("orderCharacteristics", newOrder)
        }

        draggedItemIndexRef.current = index
    }, [form, orderedCharacteristicValues])

    const handleDragEnd = useCallback(() => {
        draggedItemIndexRef.current = null
    }, [])

    /**
     * Perf: A characteristic row is memoized so typing in one field doesn't rerender the whole list.
     * This is critical when many characteristics exist.
     */
    const CharacteristicRow = useMemo(() => {
        type Props = {
            cv: MaterialCharacteristicClient
            index: number
            isEditing: boolean
            onRemove: (characteristicId: string) => void
            onValueChange: (characteristicId: string, value: any) => void
            onDragStart: (index: number) => void
            onDragOver: (e: React.DragEvent, index: number) => void
            onDragEnd: () => void
        }

        return memo(function CharacteristicRowImpl({
            cv,
            index,
            isEditing,
            onRemove,
            onValueChange,
            onDragStart,
            onDragOver,
            onDragEnd,
        }: Props) {
            return (
                <div
                    className="border rounded-md p-3 space-y-1"
                    draggable
                    onDragStart={() => onDragStart(index)}
                    onDragOver={(e) => onDragOver(e, index)}
                    onDragEnd={onDragEnd}
                >
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 cursor-move text-gray-400" />
                            <div className="font-medium">{cv.Characteristic.name}</div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemove(cv.characteristicId)}
                        >
                            <X className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">{cv.Characteristic.description}</div>
                    <MemoizedCharacteristicValueForm
                        characteristic={cv.Characteristic}
                        value={cv.value}
                        onChange={(value) => onValueChange(cv.characteristicId, value)}
                        isEditing={isEditing}
                    />
                </div>
            )
        })
    }, [])

    return (
        <Dialog
            open={open}
            onOpenChange={handleClose}
        >
            <DialogContent
                className="sm:max-w-[700px] max-h-[80vh] flex flex-col top-[10%] translate-y-0"
                style={{ position: "fixed", margin: "0 auto", transformOrigin: "top" }}
            >
                <DialogHeader>
                    <DialogTitle>{isEditing ? tMaterialDialog("edit") : tMaterialDialog("create")}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? tMaterialDialog("editDescription") : tMaterialDialog("createDescription")}
                    </DialogDescription>
                </DialogHeader>

                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex flex-col flex-1 overflow-hidden"
                >
                    <TabsList className="grid grid-cols-3 w-full">
                        <TabsTrigger value="general">{tMaterialDialog("general")}</TabsTrigger>
                        <TabsTrigger value="tags">{tMaterialDialog("tags")}</TabsTrigger>
                        <TabsTrigger value="characteristics">{tMaterialDialog("characteristics")}</TabsTrigger>
                    </TabsList>

                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-4 mt-4 flex flex-col overflow-hidden"
                        >
                            <div
                                className="overflow-y-auto pr-2"
                                style={{ maxHeight: "calc(70vh - 180px)" }}
                            >
                                <TabsContent
                                    value="general"
                                    className="space-y-4"
                                >
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{tMaterialDialog("name")}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={tMaterialDialog("namePlaceholder")}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{tMaterialDialog("description")}</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder={tMaterialDialog("descriptionPlaceholder")}
                                                        className="resize-none"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TabsContent>

                                <TabsContent
                                    value="tags"
                                    className="space-y-4"
                                >
                                    <FormField
                                        control={form.control}
                                        name="tagIds"
                                        render={() => (
                                            <FormItem>
                                                <FormLabel>{tMaterialDialog("tags")}</FormLabel>
                                                <FormControl>
                                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                                        {tags.map((tag) => (
                                                            <div
                                                                key={tag.id}
                                                                className="flex items-center space-x-2 p-2 rounded-md border hover:bg-muted cursor-pointer"
                                                                onClick={() => handleTagToggle(tag.id)}
                                                            >
                                                                <div className="flex-1 flex items-center space-x-2">
                                                                    <Badge
                                                                        style={{
                                                                            backgroundColor: tag.color,
                                                                            color: tag.fontColor,
                                                                        }}
                                                                    >
                                                                        {tag.name}
                                                                    </Badge>
                                                                    <span className="text-sm">
                                                                        {form
                                                                            .getValues("tagIds")
                                                                            .includes(tag.id) ? (
                                                                            <Check className="h-4 w-4 text-green-500" />
                                                                        ) : null}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {tags.length === 0 && (
                                                            <div className="col-span-2 text-center py-4 text-muted-foreground">
                                                                {tMaterialDialog("tagsUnavailable")}
                                                            </div>
                                                        )}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TabsContent>

                                <TabsContent
                                    value="characteristics"
                                    className="space-y-4"
                                >
                                    {activeTab !== "characteristics" ? null : (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <FormLabel>{tMaterialDialog("characteristics")}</FormLabel>
                                            <Combobox
                                                options={availableCharacteristics.map((characteristic) => ({
                                                    value: characteristic.id,
                                                    label: characteristic.name,
                                                }))}
                                                value={selectedCharacteristicId}
                                                onChange={handleAddCharacteristic}
                                                placeholder={tMaterialDialog("addCharacteristics")}
                                                emptyMessage={tMaterialDialog("characteristicsUnavailable")}
                                                className="w-[250px]"
                                                disabled={availableCharacteristics.length === 0}
                                            />
                                        </div>

                                        <div className="space-y-4 mb-0.5">
                                            {characteristicValues.length === 0 ? (
                                                <div className="text-center py-4 text-muted-foreground border rounded-md">
                                                    {tMaterialDialog("noCharacteristics")}
                                                </div>
                                            ) : (
                                                orderedCharacteristicValues.map((cv, index) => (
                                                    <CharacteristicRow
                                                        key={cv.characteristicId}
                                                        cv={cv}
                                                        index={index}
                                                        isEditing={isEditing}
                                                        onRemove={handleRemoveCharacteristic}
                                                        onValueChange={handleCharacteristicValueChange}
                                                        onDragStart={handleDragStart}
                                                        onDragOver={handleDragOver}
                                                        onDragEnd={handleDragEnd}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    )}
                                </TabsContent>
                            </div>

                            <DialogFooter className="pt-4">
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
                                    {isSubmitting
                                        ? tCommon("saving")
                                        : isEditing
                                          ? tCommon("update")
                                          : tCommon("create")}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
