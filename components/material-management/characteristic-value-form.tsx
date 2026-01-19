"use client"

import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { DateTimeInput } from "@/components/ui/date-time-input"
import { FilePreviewDialog } from "@/components/ui/file-preview-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { cn, formatDate } from "@/lib/utils"
import { Characteristic } from "@/prisma/generated/client"
import { parseISO } from "date-fns"
import {
    AlertCircleIcon,
    CalendarIcon,
    Download,
    Eye,
    File,
    FileArchive,
    FileSpreadsheet,
    FileText,
    FileVolume,
    Undo,
    Upload,
    X
} from "lucide-react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { BooleanField } from "./field/boolean-field"
import { CheckboxField } from "./field/checkbox-field"
import { FloatField } from "./field/float-field"
import { MultiSelectField } from "./field/multi-select-field"
import { MultiTextField } from "./field/multi-text-field"
import { NumberField } from "./field/number-field"
import { RadioField } from "./field/radio-field"
import { SelectField } from "./field/select-field"

interface CharacteristicValueFormProps {
    characteristic: Characteristic
    value: any
    onChange: (value: any) => void
    isEditing?: boolean
}

// File type detection helpers
const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase() || ""

    switch (extension) {
        case "pdf":
            return <FileText className="h-10 w-10 text-red-700" />
        case "doc":
        case "docx":
            return <FileText className="h-10 w-10 text-blue-600" />
        case "xls":
        case "xlsx":
            return <FileSpreadsheet className="h-10 w-10 text-green-600" />
        case "txt":
        case "csv":
            return <FileText className="h-10 w-10 text-gray-500" />
        case "zip":
        case "rar":
        case "7z":
        case "tar":
            return <FileArchive className="h-10 w-10 text-orange-700" />
        case "mp3":
        case "wav":
        case "ogg":
        case "wmv":
        case "mp4":
        case "avi":
        case "mkv":
            return <FileVolume className="h-10 w-10 text-purple-600" />
        default:
            return <File className="h-10 w-10 text-gray-500" />
    }
}

const isImageFile = (fileName: string) => {
    const extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"]
    return extensions.some((ext) => fileName.toLowerCase().endsWith(ext))
}

// Constants for file size limits
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file
const MAX_TOTAL_FILE_SIZE = 50 * 1024 * 1024 // 50MB max total for all files

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

// Check if file type is supported for preview
const isPreviewSupported = (fileName: string): boolean => {
    const extension = fileName.split(".").pop()?.toLowerCase() || ""
    const supportedExtensions = [
        // Images
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
        "bmp",
        "svg",
        // Documents
        "pdf",
        // Text files
        "txt",
        "csv",
        "json",
        "md",
        "xml",
        "html",
        "css",
        "js",
    ]
    return supportedExtensions.includes(extension)
}

export function CharacteristicValueForm({
    characteristic,
    value,
    onChange,
    isEditing = false,
}: CharacteristicValueFormProps) {
    const tMatFiles = useTranslations("Materials.files")
    const tCommon = useTranslations("Common")
    const [dates, setDates] = useState<{
        date?: Date
        from?: Date
        to?: Date
    }>({})
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [filePreviewUrls, setFilePreviewUrls] = useState<Map<string, string>>(new Map())

    // State for file preview dialog
    const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
    const [previewFile, setPreviewFile] = useState<{
        url: string
        name: string
        type?: string
    } | null>(null)

    // Initialize values based on characteristic type and existing value
    useEffect(() => {
        const initBaseValues = () => {
            if (characteristic.type === "date" || characteristic.type === "dateHour") {
                // Handle date type initialization
                if (value && typeof value === "object" && "date" in value) {
                    setDates({ date: new Date(value.date) })
                } else if (value && typeof value === "string") {
                    try {
                        setDates({ date: parseISO(value) })
                    } catch (e) {
                        setDates({})
                    }
                }
            } else if (characteristic.type === "dateRange" || characteristic.type === "dateHourRange") {
                // Handle date range type initialization
                if (value && typeof value === "object" && "from" in value && "to" in value) {
                    setDates({
                        from: new Date(value.from),
                        to: new Date(value.to),
                    })
                }
            }
        }
        
        initBaseValues()
    }, [characteristic.type, value])

    // Create preview URLs for uploaded files
    useEffect(() => {
        // Clean up previous preview URLs
        return () => {
            filePreviewUrls.forEach((url) => {
                if (url.startsWith("blob:")) {
                    URL.revokeObjectURL(url)
                }
            })
        }
    }, [filePreviewUrls])

    const handleDateChange = (date: Date | undefined) => {
        setDates({ ...dates, date })
        if (date) {
            onChange({ date })
        } else {
            onChange(null)
        }
    }

    const handleDateRangeChange = (field: "from" | "to") => (date: Date | undefined) => {
        const newDates = { ...dates, [field]: date }
        setDates(newDates)

        if (newDates.from && newDates.to) {
            onChange({ from: newDates.from, to: newDates.to })
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files)

            // Check individual file sizes
            const oversizedFiles = newFiles.filter((file) => file.size > MAX_FILE_SIZE)
            if (oversizedFiles.length > 0) {
                const fileNames = oversizedFiles.map((f) => f.name).join(", ")
                const message = tMatFiles.rich("fileSizeError", {
                    size: formatFileSize(MAX_FILE_SIZE),
                    files: fileNames,
                })
                console.error(message)

                toast.error(
                    tMatFiles.rich("fileSizeError", {
                        size: formatFileSize(MAX_FILE_SIZE),
                        files: fileNames,
                    }),
                )
            }

            // Filter out oversized files
            const validFiles = newFiles.filter((file) => file.size <= MAX_FILE_SIZE)
            if (validFiles.length === 0) return
            // Create preview URLs for new files
            validFiles.forEach((file) => {
                const previewUrl = URL.createObjectURL(file)
                setFilePreviewUrls((prev) => new Map(prev).set(file.name + Math.random(), previewUrl))
            })

            // Calculate total size of files being uploaded in this operation
            const totalNewFilesSize = validFiles.reduce((sum, file) => sum + file.size, 0)

            // Check if the size of files in this upload operation exceeds the limit
            if (totalNewFilesSize > MAX_TOTAL_FILE_SIZE) {
                const message = tMatFiles.rich("totalSizeError", {
                    size: formatFileSize(totalNewFilesSize),
                    maxSize: formatFileSize(MAX_TOTAL_FILE_SIZE),
                })

                console.error(message)
                toast.error(message)
                return
            }

            // Update for edit mode (append to existing fileToAdd)
            const currentValue = value || {}
            const currentFilesToAdd = Array.isArray(currentValue.fileToAdd) ? currentValue.fileToAdd : []
            const currentFilesToDelete = Array.isArray(currentValue.fileToDelete) ? currentValue.fileToDelete : []

            onChange({
                fileToAdd: [...currentFilesToAdd, ...validFiles],
                fileToDelete: currentFilesToDelete,
                file: currentValue.file,
            })
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const removeNewFile = (index: number) => {
        if (isEditing) {
            // Remove from fileToAdd in edit mode
            const currentValue = value || {}
            const currentFilesToAdd = Array.isArray(currentValue.fileToAdd) ? [...currentValue.fileToAdd] : []

            // Revoke the URL if it exists
            const file = currentFilesToAdd[index]
            const key = file.name + index
            if (filePreviewUrls.has(key)) {
                URL.revokeObjectURL(filePreviewUrls.get(key)!)
                setFilePreviewUrls((prev) => {
                    const newMap = new Map(prev)
                    newMap.delete(key)
                    return newMap
                })
            }

            currentFilesToAdd.splice(index, 1)

            onChange({
                ...currentValue,
                fileToAdd: currentFilesToAdd,
            })
        } else {
            // Remove from file array in create mode
            const currentFiles = value && typeof value === "object" && "fileToAdd" in value ? [...value.fileToAdd] : []

            // Revoke the URL if it exists
            const file = currentFiles[index]
            const key = file.name + index
            if (filePreviewUrls.has(key)) {
                URL.revokeObjectURL(filePreviewUrls.get(key)!)
                setFilePreviewUrls((prev) => {
                    const newMap = new Map(prev)
                    newMap.delete(key)
                    return newMap
                })
            }

            currentFiles.splice(index, 1)
            onChange({ fileToAdd: currentFiles })
        }
    }

    const markFileForDeletion = (fileId: string) => {
        if (!isEditing) return

        const currentValue = value || {}
        const currentFilesToDelete = Array.isArray(currentValue.fileToDelete) ? [...currentValue.fileToDelete] : []

        // Add file to delete list if not already there
        if (!currentFilesToDelete.includes(fileId)) {
            onChange({
                ...currentValue,
                fileToDelete: [...currentFilesToDelete, fileId],
            })
        }
    }

    const unmarkFileForDeletion = (fileId: string) => {
        if (!isEditing) return

        const currentValue = value || {}
        const currentFilesToDelete = Array.isArray(currentValue.fileToDelete)
            ? currentValue.fileToDelete.filter((id: string) => id !== fileId)
            : []

        onChange({
            ...currentValue,
            fileToDelete: currentFilesToDelete,
        })
    }

    const isFileMarkedForDeletion = (fileId: string): boolean => {
        if (!isEditing) return false
        return (
            value &&
            typeof value === "object" &&
            "fileToDelete" in value &&
            Array.isArray(value.fileToDelete) &&
            (value as { fileToDelete: string[] }).fileToDelete.includes(fileId)
        )
    }

    // Open file preview dialog
    const handleOpenPreview = (file: { id: string; name: string; type: string }) => {
        const fileUrl = `/api/image/${file.id}`
        setPreviewFile({
            url: fileUrl,
            name: file.name,
            type: file.type,
        })
        setPreviewDialogOpen(true)
    }

    const renderFormControl = () => {
        const { type, options, units } = characteristic
        const optionsArray: any[] = options ? (typeof options === "string" ? JSON.parse(options) : options) : []

        switch (type) {
            case "text":
                return (
                    <Input
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={tCommon("enterTextValue")}
                    />
                )

            case "textarea":
                return (
                    <Textarea
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={tCommon("enterDetailedText")}
                        className="resize-none"
                    />
                )

            case "number":
                return (
                    <NumberField
                        value={value || 0}
                        onChange={onChange}
                        units={units}
                        placeholder={tCommon("enterNumber")}
                    />
                )

            case "float":
                return (
                    <FloatField
                        value={value || ""}
                        onChange={onChange}
                        units={units}
                        placeholder={tCommon("enterDecimalNumber")}
                    />
                )

            case "boolean":
                return (
                    <BooleanField
                        value={value || false}
                        onChange={onChange}
                    />
                )

            case "checkbox":
                return (
                    <CheckboxField
                        value={value || []}
                        onChange={onChange}
                        options={optionsArray}
                    />
                )

            case "select":
                return (
                    <SelectField
                        value={value || ""}
                        onChange={onChange}
                        options={optionsArray}
                        placeholder={tCommon("selectOption")}
                    />
                )

            case "radio":
                return (
                    <RadioField
                        value={value || ""}
                        onChange={onChange}
                        options={optionsArray}
                    />
                )

            case "multiSelect":
                return (
                    <MultiSelectField
                        value={value || []}
                        onChange={onChange}
                        options={optionsArray}
                    />
                )

            case "multiText":
            case "multiTextArea":
                return (
                    <MultiTextField
                        value={value}
                        onChange={onChange}
                        useTextArea={type === "multiTextArea"}
                        titlePlaceholder={tCommon("enterTextValue")}
                        textPlaceholder={tCommon("enterDetailedText")}
                    />
                )

            case "date":
                return (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={`w-full justify-start text-left font-normal ${!dates.date && "text-muted-foreground"}`}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dates.date ? formatDate(dates.date) : tCommon("selectDate")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={dates.date}
                                onSelect={handleDateChange}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                )

            case "dateHour":
                return (
                    <DateTimeInput
                        date={dates.date}
                        onDateChange={handleDateChange}
                        showTime
                    />
                )

            case "dateRange":
                return (
                    <div className="space-y-2">
                        <div>
                            <Label>{tCommon("from")}</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={`w-full justify-start text-left font-normal ${!dates.from && "text-muted-foreground"}`}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dates.from ? formatDate(dates.from) : tCommon("selectStartDate")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={dates.from}
                                        onSelect={handleDateRangeChange("from")}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div>
                            <Label>{tCommon("to")}</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={`w-full justify-start text-left font-normal ${!dates.to && "text-muted-foreground"}`}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dates.to ? formatDate(dates.to) : tCommon("selectEndDate")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={dates.to}
                                        onSelect={handleDateRangeChange("to")}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                )

            case "dateHourRange":
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>{tCommon("from")}</Label>
                            <DateTimeInput
                                date={dates.from}
                                onDateChange={handleDateRangeChange("from")}
                                showTime
                            />
                        </div>

                        <div>
                            <Label>{tCommon("to")}</Label>
                            <DateTimeInput
                                date={dates.to}
                                onDateChange={handleDateRangeChange("to")}
                                showTime
                            />
                        </div>
                    </div>
                )

            case "email":
                return (
                    <Input
                        type="email"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={tCommon("enterEmailAddress")}
                    />
                )

            case "link":
                return (
                    <Input
                        type="url"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={tCommon("enterURL")}
                    />
                )

            case "file":
                let files: File[] = []
                let existingFiles: Array<{ id: string; name: string; type: string }> = []
                let filesToDelete: string[] = []
                // Initialize file data based on value and editing state
                if (isEditing) {
                    if (value && typeof value === "object") {
                        if ("fileToAdd" in value && Array.isArray(value.fileToAdd)) {
                            files = value.fileToAdd

                            // Create preview URLs for new files
                            files.forEach((file, index) => {
                                if (!filePreviewUrls.has(file.name + index)) {
                                    const previewUrl = URL.createObjectURL(file)
                                    setFilePreviewUrls((prev) => new Map(prev).set(file.name + index, previewUrl))
                                }
                            })
                        }
                        if ("fileToDelete" in value && Array.isArray(value.fileToDelete)) {
                            filesToDelete = value.fileToDelete
                        }
                    }

                    // Get existing files from the related File entities
                    if (characteristic && characteristic.id) {
                        // Parse existingFiles from the original value
                        const currentMaterialValue =
                            value && typeof value === "object" && "file" in value ? value.file : []
                        existingFiles = Array.isArray(currentMaterialValue) ? currentMaterialValue : []
                    }
                } else {
                    // For new material, just handle new files
                    if (value && typeof value === "object" && "fileToAdd" in value && Array.isArray(value.fileToAdd)) {
                        files = value.fileToAdd

                        // Create preview URLs for new files
                        files.forEach((file, index) => {
                            if (!filePreviewUrls.has(file.name + index)) {
                                const previewUrl = URL.createObjectURL(file)
                                setFilePreviewUrls((prev) => new Map(prev).set(file.name + index, previewUrl))
                            }
                        })
                    }
                }

                return (
                    <div>
                        {/* Upload button */}
                        <div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                multiple
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    fileInputRef.current?.click()
                                }}
                                className="w-full"
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                {tMatFiles("uploadFiles")}
                            </Button>
                        </div>

                        <div className="flex flex-col gap-1">
                            {/* Display new files */}
                            {files && files.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium mb-2">{tMatFiles("newFiles")}</h4>
                                    {process.env.NEXT_PUBLIC_STORAGE_ENABLED !== "true" && (
                                        <Alert variant="warning" className="mb-2">
                                            <AlertCircleIcon />
                                            <AlertTitle>
                                                    {tMatFiles("storageDisabled")}
                                                </AlertTitle>
                                            </Alert>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                        {files.map((file, index) => (
                                            <div
                                                key={`new-${index}`}
                                                className="relative border rounded-md p-2 flex items-center gap-1 group bg-green-600/20"
                                            >
                                                <div className="h-18 w-18 min-w-14  rounded-md overflow-hidden bg-accent flex items-center justify-center">
                                                    {isImageFile(file.name) ? (
                                                        <img
                                                            src={filePreviewUrls.get(file.name + index) || ""}
                                                            alt={file.name}
                                                            className="h-full w-full object-scale-down"
                                                        />
                                                    ) : (
                                                        getFileIcon(file.name)
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p
                                                        className="text-sm font-medium truncate"
                                                        title={file.name}
                                                    >
                                                        {file.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {Math.round(file.size / 1024)} KB
                                                    </p>
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => removeNewFile(index)}
                                                    aria-label={tCommon("delete")}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isEditing && existingFiles && existingFiles.length > 0 && (
                                <div className="flex flex-col gap-2 mt-2">
                                    <h4 className="text-sm font-medium">{tMatFiles("existingFiles")}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                        {existingFiles.map((file) => {
                                            const isMarkedForDeletion = isFileMarkedForDeletion(file.id)
                                            const fileUrl = `/api/image/${file.id}`
                                            const canPreview = isPreviewSupported(file.name)

                                            return (
                                                <div
                                                    key={`existing-${file.id}`}
                                                    className={cn(
                                                        "relative border rounded-md p-2 flex items-center gap-2 group transition-all",
                                                        isMarkedForDeletion
                                                            ? "bg-destructive/20"
                                                            : "hover:bg-accent/20",
                                                    )}
                                                >
                                                    <div className="h-18 w-18 min-w-14 rounded-md overflow-hidden bg-accent flex items-center justify-center">
                                                        {isImageFile(file.name) ? (
                                                            <Image
                                                                src={fileUrl}
                                                                alt={file.name}
                                                                width={72}
                                                                height={72}
                                                                className="h-full w-full object-scale-down"
                                                                onError={(e) => {
                                                                    // If image fails to load, show file icon instead
                                                                    const target = e.target as HTMLImageElement
                                                                    target.style.display = "none"
                                                                    target.parentElement!.appendChild(
                                                                        (() => {
                                                                            const div =
                                                                                document.createElement("div")
                                                                            div.className =
                                                                                "h-full w-full flex items-center justify-center"
                                                                            div.appendChild(
                                                                                getFileIcon(
                                                                                    file.name,
                                                                                ) as unknown as Node,
                                                                            )
                                                                            return div
                                                                        })(),
                                                                    )
                                                                }}
                                                            />
                                                        ) : (
                                                            getFileIcon(file.name)
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p
                                                            className="text-sm font-medium truncate"
                                                            title={file.name}
                                                        >
                                                            {file.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {isMarkedForDeletion
                                                                ? tMatFiles("markedForDeletion")
                                                                : file.type || "File"}
                                                        </p>
                                                        {!isMarkedForDeletion && (
                                                            <div className="flex gap-1">
                                                                {canPreview && (
                                                                    <Button
                                                                        type="button"
                                                                        size={"sm"}
                                                                        variant={"ghost"}
                                                                        className="cursor-pointer inline-flex font-normal items-center text-xs text-primary hover:underline"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            handleOpenPreview(file)
                                                                        }}
                                                                    >
                                                                        <Eye className="h-3 w-3" />
                                                                        {tMatFiles("view")}
                                                                    </Button>
                                                                )}
                                                                <a
                                                                    href={fileUrl}
                                                                    download={file.name}
                                                                    className={cn(
                                                                        buttonVariants({
                                                                            variant: "ghost",
                                                                            size: "sm",
                                                                        }),
                                                                        "text-xs hover:underline font-normal",
                                                                    )}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                    }}
                                                                >
                                                                    <Download className="h-3 w-3 mr-1" />
                                                                    {tMatFiles("download")}
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            e.preventDefault()
                                                            isMarkedForDeletion
                                                                ? unmarkFileForDeletion(file.id)
                                                                : markFileForDeletion(file.id)
                                                        }}
                                                    >
                                                        {isMarkedForDeletion ? (
                                                            <Undo className="h-4 w-4" />
                                                        ) : (
                                                            <X className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* File Preview Dialog */}
                        {previewFile && (
                            <FilePreviewDialog
                                open={previewDialogOpen}
                                onOpenChange={setPreviewDialogOpen}
                                fileUrl={previewFile.url}
                                fileName={previewFile.name}
                                fileType={previewFile.type}
                            />
                        )}
                    </div>
                )

            default:
                return <div className="text-red-500">Unsupported characteristic type: {type}</div>
        }
    }

    return <div className="space-y-2">{renderFormControl()}</div>
}
