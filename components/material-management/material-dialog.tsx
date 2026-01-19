"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Check, GripVertical, X } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
    buildCharacteristicDefaultValue,
    isCharacteristicValueFile,
    isCharacteristicValueFileClient,
} from "@/lib/utils.client"
import { Characteristic, Tag } from "@/prisma/generated/browser"
import { MaterialCharacteristicClient } from "@/types/characteristic.type"
import { MaterialWithTag } from "@/types/material.type"
import { useTranslations } from "next-intl"
import { CharacteristicValueForm } from "./characteristic-value-form"

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
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null)
    const tCommon = useTranslations("Common")
    const tMaterialDialog = useTranslations("Materials.dialog")
    const tMaterials = useTranslations("Materials")

    const isEditing = !!material

    const form = useForm<MaterialFormValues>({
        resolver: zodResolver(materialSchema),
        defaultValues: {
            name: material?.name || "",
            description: material?.description || "",
            tagIds: material?.Tags.map((tag) => tag.id) || [],
            orderCharacteristics: material?.order_Material_Characteristic || [],
        },
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
                const processedCharacteristicValues = characteristicValues.map((cv) => {
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
                        // Ensure date is in the correct format
                        return {
                            characteristicId: cv.characteristicId,
                            value:
                                cv.value && typeof cv.value === "object" && "date" in cv.value
                                    ? { date: new Date(cv.value.date).toISOString() }
                                    : null,
                        }
                    }

                    // Handle date range types
                    if (cv.Characteristic.type === "dateRange" || cv.Characteristic.type === "dateHourRange") {
                        // Ensure dateRange is in the correct format
                        return {
                            characteristicId: cv.characteristicId,
                            value:
                                cv.value && typeof cv.value === "object" && "from" in cv.value && "to" in cv.value
                                    ? {
                                          from: new Date(cv.value.from).toISOString(),
                                          to: new Date(cv.value.to).toISOString(),
                                      }
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
                // Update existing material
                const result = await updateMaterialAction({
                    id: material.id,
                    name: values.name,
                    description: values.description || "",
                    tagIds: values.tagIds,
                    orderCharacteristics: values.orderCharacteristics,
                    characteristicValues: processedCharacteristicValues,
                })

                if (result?.serverError) {
                    console.error(result?.serverError)
                    return toast.error(tMaterials("errors.updateFailed"))
                } else if (result?.validationErrors) {
                    console.error(result?.validationErrors)
                    return toast.error(tMaterials("errors.updateFailed"))
                } else if (!result?.data) {
                    console.error("No data returned")
                    return toast.error(tMaterials("errors.updateFailed"))
                }

                toast.success(tMaterials("success.updateSuccess"))
            } else {
                const processedCharacteristicValues = characteristicValues.map((cv) => {
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
                        // Ensure date is in the correct format
                        return {
                            characteristicId: cv.characteristicId,
                            value:
                                cv.value && typeof cv.value === "object" && "date" in cv.value
                                    ? { date: new Date(cv.value.date).toISOString() }
                                    : null,
                        }
                    }

                    // Handle date range types
                    if (cv.Characteristic.type === "dateRange" || cv.Characteristic.type === "dateHourRange") {
                        // Ensure dateRange is in the correct format
                        return {
                            characteristicId: cv.characteristicId,
                            value:
                                cv.value && typeof cv.value === "object" && "from" in cv.value && "to" in cv.value
                                    ? {
                                          from: new Date(cv.value.from).toISOString(),
                                          to: new Date(cv.value.to).toISOString(),
                                      }
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

                // Create new material
                const result = await createMaterialAction({
                    name: values.name,
                    description: values.description || "",
                    tagIds: values.tagIds,
                    orderCharacteristics: values.orderCharacteristics,
                    characteristicValues: processedCharacteristicValues,
                })

                if (result?.serverError) {
                    console.error(result?.serverError)
                    return toast.error(tMaterials("errors.createFailed"))
                } else if (result?.validationErrors) {
                    console.error(result?.validationErrors)
                    return toast.error(tMaterials("errors.createFailed"))
                } else if (!result?.data) {
                    console.error("No data returned")
                    return toast.error(tMaterials("errors.createFailed"))
                }

                toast.success(tMaterials("success.createSuccess"))
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

    const handleAddCharacteristic = (characteristicId: string) => {
        // Check if already added
        if (characteristicValues.some((cv) => cv.characteristicId === characteristicId)) {
            return
        }

        const characteristic = characteristics.find((c) => c.id === characteristicId)

        if (characteristic) {
            const newValueCharacteristic = buildCharacteristicDefaultValue(characteristic)

            setCharacteristicValues([...characteristicValues, newValueCharacteristic])
            // Add to the order list
            const currentOrder = form.getValues("orderCharacteristics")
            form.setValue("orderCharacteristics", [...currentOrder, characteristicId])
        }
    }

    const handleRemoveCharacteristic = (characteristicId: string) => {
        setCharacteristicValues(characteristicValues.filter((cv) => cv.characteristicId !== characteristicId))

        // Remove from the order list
        const currentOrder = form.getValues("orderCharacteristics")
        form.setValue(
            "orderCharacteristics",
            currentOrder.filter((id) => id !== characteristicId),
        )
    }

    const handleCharacteristicValueChange = (characteristicId: string, value: any) => {
        setCharacteristicValues(
            characteristicValues.map((cv) => (cv.characteristicId === characteristicId ? { ...cv, value } : cv)),
        )
    }

    const getAvailableCharacteristics = () => {
        return characteristics.filter((c) => !characteristicValues.some((cv) => cv.characteristicId === c.id))
    }

    // Get ordered characteristic values based on the current order
    const getOrderedCharacteristicValues = () => {
        const order = form.getValues("orderCharacteristics")

        // First, sort by the order array
        const orderedValues = [...characteristicValues].sort((a, b) => {
            const aIndex = order.indexOf(a.characteristicId)
            const bIndex = order.indexOf(b.characteristicId)

            // If not in order array, put at the end
            if (aIndex === -1) return 1
            if (bIndex === -1) return -1

            return aIndex - bIndex
        })

        return orderedValues
    }

    // Drag and drop handlers
    const handleDragStart = (index: number) => {
        setDraggedItemIndex(index)
    }

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault()
        if (draggedItemIndex === null || draggedItemIndex === index) return

        // Reorder the characteristics
        const orderedValues = getOrderedCharacteristicValues()
        const order = form.getValues("orderCharacteristics")

        // Get the item being dragged and the target position
        const draggedItem = orderedValues[draggedItemIndex]

        // Create new order by moving the dragged item
        const newOrder = [...order]
        const fromIndex = newOrder.indexOf(draggedItem.characteristicId)
        const toIndex = newOrder.indexOf(orderedValues[index].characteristicId)

        if (fromIndex !== -1 && toIndex !== -1) {
            newOrder.splice(fromIndex, 1)
            newOrder.splice(toIndex, 0, draggedItem.characteristicId)
            form.setValue("orderCharacteristics", newOrder)
        }

        setDraggedItemIndex(index)
    }

    const handleDragEnd = () => {
        setDraggedItemIndex(null)
    }

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
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <FormLabel>{tMaterialDialog("characteristics")}</FormLabel>
                                            <Select
                                                onValueChange={handleAddCharacteristic}
                                                value=""
                                            >
                                                <SelectTrigger className="w-[250px]">
                                                    <SelectValue
                                                        placeholder={tMaterialDialog("addCharacteristics")}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {getAvailableCharacteristics().map((characteristic) => (
                                                        <SelectItem
                                                            key={characteristic.id}
                                                            value={characteristic.id}
                                                        >
                                                            {characteristic.name}
                                                        </SelectItem>
                                                    ))}
                                                    {getAvailableCharacteristics().length === 0 && (
                                                        <SelectItem
                                                            value="none"
                                                            disabled
                                                        >
                                                            {tMaterialDialog("characteristicsUnavailable")}
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-4 mb-0.5">
                                            {characteristicValues.length === 0 ? (
                                                <div className="text-center py-4 text-muted-foreground border rounded-md">
                                                    {tMaterialDialog("noCharacteristics")}
                                                </div>
                                            ) : (
                                                getOrderedCharacteristicValues().map((cv, index) => (
                                                    <div
                                                        key={cv.characteristicId}
                                                        className="border rounded-md p-3 space-y-1"
                                                        draggable
                                                        onDragStart={() => handleDragStart(index)}
                                                        onDragOver={(e) => handleDragOver(e, index)}
                                                        onDragEnd={handleDragEnd}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-2">
                                                                <GripVertical className="h-4 w-4 cursor-move text-gray-400" />
                                                                <div className="font-medium">
                                                                    {cv.Characteristic.name}
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    handleRemoveCharacteristic(cv.characteristicId)
                                                                }
                                                            >
                                                                <X className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {cv.Characteristic.description}
                                                        </div>
                                                        <CharacteristicValueForm
                                                            characteristic={cv.Characteristic}
                                                            value={cv.value}
                                                            onChange={(value) => {
                                                                handleCharacteristicValueChange(
                                                                    cv.characteristicId,
                                                                    value,
                                                                )
                                                            }}
                                                            isEditing={isEditing}
                                                        />
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
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
