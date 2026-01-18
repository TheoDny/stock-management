"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { HexColorPicker } from "react-colorful"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { createTagAction, deleteTagAction, updateTagAction } from "@/actions/tag.action"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TagAndCountMaterial } from "@/types/tag.type"

const createTagSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    fontColor: z.string().min(4, "Color text must be a valid color"),
    color: z.string().min(4, "Color must be a valid color"),
})

const updateTagSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    fontColor: z.string().min(4, "Color text must be a valid color"),
    color: z.string().min(4, "Color must be a valid color"),
})

type CreateTagFormValues = z.infer<typeof createTagSchema>
type UpdateTagFormValues = z.infer<typeof updateTagSchema>

interface TagDialogProps {
    open: boolean
    tag: TagAndCountMaterial | null
    onClose: (refreshData: boolean) => void
}

export function TagDialog({ open, tag, onClose }: TagDialogProps) {
    const t = useTranslations("Configuration.tags.dialog")
    const tCommon = useTranslations("Common")

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [showTextColorPicker, setShowTextColorPicker] = useState(false)

    const isEditing = !!tag
    const canDelete = isEditing && tag?._count?.Materials === 0

    const createForm = useForm<CreateTagFormValues>({
        resolver: zodResolver(createTagSchema),
        defaultValues: {
            name: "",
            fontColor: "#000000",
            color: "#ffffff",
        },
    })

    const updateForm = useForm<UpdateTagFormValues>({
        resolver: zodResolver(updateTagSchema),
        defaultValues: {
            name: tag?.name || "",
            fontColor: tag?.fontColor || "#000000",
            color: tag?.color || "#ffffff",
        },
    })

    const form = isEditing ? updateForm : createForm

    useEffect(() => {
        if (open && tag) {
            updateForm.reset({
                name: tag.name,
                fontColor: tag.fontColor,
                color: tag.color,
            })
        } else if (open && !tag) {
            createForm.reset({
                name: "",
                fontColor: "#000000",
                color: "#ffffff",
            })
        }
    }, [open, tag, updateForm, createForm])

    const handleClose = (refreshData: boolean = false) => {
        form.reset()
        setShowColorPicker(false)
        setShowTextColorPicker(false)
        onClose(refreshData)
    }

    const onSubmit = async (values: CreateTagFormValues | UpdateTagFormValues) => {
        setIsSubmitting(true)

        try {
            if (isEditing && tag) {
                // Update existing tag
                const updateValues = values as UpdateTagFormValues
                await updateTagAction({
                    id: tag.id,
                    name: updateValues.name,
                    fontColor: updateValues.fontColor,
                    color: updateValues.color,
                })
                toast.success(t("updateSuccess"))
            } else {
                // Create new tag
                const createValues = values as CreateTagFormValues
                await createTagAction({
                    name: createValues.name,
                    fontColor: createValues.fontColor,
                    color: createValues.color,
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
        if (!tag || !canDelete) return

        setIsSubmitting(true)
        const result = await deleteTagAction({
            id: tag.id,
        })
        setIsSubmitting(true)

        if (result?.serverError) {
            console.error(result?.serverError)
            return toast.error(t("deleteError"))
        } else if (result?.validationErrors) {
            console.error(result?.validationErrors)
            return toast.error(t("deleteError"))
        } else if (!result?.data) {
            console.error("No data returned")
            return toast.error(t("deleteError"))
        }

        toast.success(t("deleteSuccess"))
        handleClose(true)
    }

    const getPreviewBadge = () => {
        const color = form.watch("color")
        const fontColor = form.watch("fontColor")
        const name = form.watch("name")

        return (
            <Badge
                style={{
                    backgroundColor: color,
                    color: fontColor,
                }}
            >
                {name || "Preview"}
            </Badge>
        )
    }

    return (
        <Dialog
            open={open}
            onOpenChange={handleClose}
        >
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? t("edit") : t("create")}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? t("editDescription") : t("createDescription")}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-1"
                    >
                        <FormField
                            control={form.control}
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
                                    {isEditing ? (
                                        <FormDescription>{t("nameUpdateWarning")}</FormDescription>
                                    ) : (
                                        <FormDescription>{t("nameHelp")}</FormDescription>
                                    )}
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="fontColor"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("textColor")}</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center space-x-2">
                                            <div
                                                className="w-6 h-6 rounded-full cursor-pointer border"
                                                style={{ backgroundColor: field.value }}
                                                onClick={() => setShowTextColorPicker(!showTextColorPicker)}
                                            />
                                            <Input
                                                placeholder="#000000"
                                                {...field}
                                                onClick={() => setShowTextColorPicker(true)}
                                            />
                                        </div>
                                    </FormControl>
                                    {showTextColorPicker && (
                                        <HexColorPicker
                                            color={field.value}
                                            onChange={field.onChange}
                                            className="!w-full"
                                        />
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("backgroundColor")}</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center space-x-2">
                                            <div
                                                className="w-6 h-6 rounded-full cursor-pointer border"
                                                style={{ backgroundColor: field.value }}
                                                onClick={() => setShowColorPicker(!showColorPicker)}
                                            />
                                            <Input
                                                placeholder="#ffffff"
                                                {...field}
                                                onClick={() => setShowColorPicker(true)}
                                            />
                                        </div>
                                    </FormControl>
                                    {showColorPicker && (
                                        <HexColorPicker
                                            color={field.value}
                                            onChange={field.onChange}
                                            className="!w-full"
                                        />
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-2">
                            <FormLabel>{t("preview")}</FormLabel>
                            <div className="p-4 border rounded-md flex items-center justify-center">
                                {getPreviewBadge()}
                            </div>
                        </div>

                        <DialogFooter className="flex !justify-between">
                            {isEditing && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={handleDelete}
                                                disabled={!canDelete || isSubmitting}
                                                className="gap-2 text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                {tCommon("delete")}
                                            </Button>
                                        </div>
                                    </TooltipTrigger>
                                    {!canDelete && tag?._count?.Materials > 0 && (
                                        <TooltipContent>
                                            <p>{t("cannotDeleteUsed")}</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            )}
                            <div className={"flex gap-2"}>
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
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
