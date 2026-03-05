"use client"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FilePreviewDialog } from "@/components/ui/file-preview-dialog"
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Separator } from "@/components/ui/separator"
import { cn, formatDate } from "@/lib/utils"
import {
    CharacteristicHistory,
    CharacteristicHistoryBoolean,
    CharacteristicHistoryDate,
    CharacteristicHistoryDateRange,
    CharacteristicHistoryFile,
    CharacteristicHistoryMulti,
    CharacteristicHistoryMultiText,
    CharacteristicHistoryString,
} from "@/types/material-history.type"
import {
    Calendar,
    Check,
    Download,
    ExternalLink,
    Eye,
    File,
    FileArchive,
    FileSpreadsheet,
    FileText,
    FileVolume,
    Link,
    Mail,
    X,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Image from "next/image"
import React, { useState } from "react"

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

const isStringType = (charac: CharacteristicHistory): charac is CharacteristicHistoryString => {
    return ["text", "textarea", "link", "email", "number", "float"].includes(charac.type)
}

const isBooleanType = (charac: CharacteristicHistory): charac is CharacteristicHistoryBoolean => {
    return charac.type === "boolean"
}

const isDateType = (charac: CharacteristicHistory): charac is CharacteristicHistoryDate => {
    return ["date", "dateHour"].includes(charac.type)
}

const isDateRangeType = (charac: CharacteristicHistory): charac is CharacteristicHistoryDateRange => {
    return ["dateRange", "dateHourRange"].includes(charac.type)
}

const isFileType = (charac: CharacteristicHistory): charac is CharacteristicHistoryFile => {
    return charac.type === "file"
}

const isMultiSelectType = (charac: CharacteristicHistory): charac is CharacteristicHistoryMulti => {
    return ["multiSelect", "select", "checkbox", "radio"].includes(charac.type)
}

const isMultiTextType = (charac: CharacteristicHistory): charac is CharacteristicHistoryMultiText => {
    return ["multiText", "multiTextArea"].includes(charac.type)
}

interface CharacteristicDisplayProps {
    characteristic: CharacteristicHistory
}

/**
 * Displays a single characteristic with its label and value.
 * The label shows a HoverCard with the description when available.
 */
export function CharacteristicDisplay({ characteristic }: CharacteristicDisplayProps) {
    const tFiles = useTranslations("Materials.files")
    const tCommon = useTranslations("Common")

    const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
    const [previewFile, setPreviewFile] = useState<{
        url: string
        name: string
        type?: string
    } | null>(null)
    const locale = useLocale() as "en" | "fr"
    const handleOpenPreview = (file: { name: string; path: string; type: string }) => {
        setPreviewFile({
            url: `/api/image/path/${file.path}`,
            name: file.name,
            type: file.type,
        })
        setPreviewDialogOpen(true)
    }

    const renderLabel = () => {
        if (!characteristic.description) {
            return <span className="text-sm">{characteristic.name}</span>
        }

        return (
            <HoverCard>
                <HoverCardTrigger asChild>
                    <span className="text-sm underline underline-offset-2">
                        {characteristic.name}
                    </span>
                </HoverCardTrigger>
                <HoverCardContent>
                    <p className="text-sm">{characteristic.description}</p>
                </HoverCardContent>
            </HoverCard>
        )
    }

    const wrapWithLabel = (content: React.ReactNode) => (
        <div className="grid grid-cols-4 gap-1 font-medium">
            {renderLabel()}
            <div className="col-span-3">{content}</div>
        </div>
    )

    const renderValue = () => {
        if (characteristic.value === null || characteristic.value === undefined) {
            return wrapWithLabel(<span className="text-muted-foreground">N/A</span>)
        }

        // Basic text types (string value)
        if (
            isStringType(characteristic) &&
            ["text", "number", "float", "textarea"].includes(characteristic.type)
        ) {
            return wrapWithLabel(<span className="text-sm">{characteristic.value}</span>)
        }
        // Boolean value
        if (isBooleanType(characteristic)) {
            return wrapWithLabel(
                characteristic.value ? (
                    <span className="flex items-center gap-1 text-green-600">
                        <Check className="h-4 w-4" />
                        {tCommon("yes")}
                    </span>
                ) : (
                        <span className="flex items-center gap-1 text-red-600">
                            <X className="h-4 w-4" />
                            {tCommon("no")}
                        </span>
                    )
            )
        }

        // Date values
        if (isDateType(characteristic)) {
            const dateValue = characteristic.value.date ? new Date(characteristic.value.date) : null

            return wrapWithLabel(
                dateValue ? (
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(dateValue, characteristic.type === "dateHour" ? "PPp" : "PPP", locale)}</span>
                    </div>
                ) : (
                    <span className="text-muted-foreground">N/A</span>
                    )
            )
        }

        // Date range values
        if (isDateRangeType(characteristic)) {
            const fromDate = characteristic.value.from
            const toDate = characteristic.value.to 

            return wrapWithLabel(
                fromDate && toDate ? (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                                {tCommon("from")}:{" "}
                                {formatDate(fromDate, characteristic.type === "dateHourRange" ? "PPp" : "PPP", locale)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 ml-6">
                            <span>
                                {tCommon("to")}:{" "}
                                {formatDate(toDate, characteristic.type === "dateHourRange" ? "PPp" : "PPP", locale)}
                            </span>
                        </div>
                    </div>
                ) : (
                    <span className="text-muted-foreground">N/A</span>
                ),
            )
        }

        // Link value
        if (isStringType(characteristic) && characteristic.type === "link") {
            return wrapWithLabel(
                <a
                    href={characteristic.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                >
                    <Link className="h-4 w-4" />
                    <span>{characteristic.value}</span>
                    <ExternalLink className="h-3 w-3" />
                </a>,
            )
        }

        // Email value
        if (isStringType(characteristic) && characteristic.type === "email") {
            return wrapWithLabel(
                <a
                    href={`mailto:${characteristic.value}`}
                    className="flex items-center gap-1 text-primary hover:underline"
                >
                    <Mail className="h-4 w-4" />
                    <span>{characteristic.value}</span>
                </a>,
            )
        }

        // Select & Radio (single selection)
        if (
            isMultiSelectType(characteristic) &&
            (characteristic.type === "select" || characteristic.type === "radio")
        ) {
            return wrapWithLabel(<span>{characteristic.value}</span>)
        }

        // Checkbox (boolean displayed as text)
        if (isMultiSelectType(characteristic) && characteristic.type === "checkbox") {
            const valueCheckbox = characteristic.value as unknown as { [key: string]: boolean }[]

            return wrapWithLabel(
                <div className="flex flex-wrap gap-2">
                    {valueCheckbox.map((item, index) => (
                        <Badge key={index} variant="outline">{Object.keys(item)[0]}</Badge>
                    ))}
                </div>
            )
        }

        // MultiSelect (array of values)
        if (isMultiSelectType(characteristic) && characteristic.type === "multiSelect") {
            return wrapWithLabel(
                <div className="flex flex-wrap gap-1">
                    {Array.isArray(characteristic.value) &&
                        characteristic.value.map((item, index) => (
                            <Badge key={index} variant="outline">
                                {item}
                            </Badge>
                        ))}
                </div>,
            )
        }

        // MultiText / MultiTextArea
        if (isMultiTextType(characteristic)) {
            return wrapWithLabel(
                <div className="flex flex-col gap-1 w-full">
                    {characteristic.value.multiText.map((item, index) => (
                        <Card key={index} className="overflow-hidden p-0">
                            <CardContent className="p-3 gap-1">
                                <h4 className="text-sm font-medium mb-1">{item.title}</h4>
                                <Separator className="mb-1" />
                                <p
                                    className={cn(
                                        "text-sm",
                                        characteristic.type === "multiTextArea" ? "whitespace-pre-wrap" : "",
                                    )}
                                >
                                    {item.text}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>,
            )
        }

        // File type
        if (isFileType(characteristic)) {
            return wrapWithLabel(
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    {characteristic.value.file.map((file, index) => {
                        const fileUrl = `/api/image/path/${file.path.replaceAll("\\", "/")}`
                        const canPreview = isPreviewSupported(file.name)

                        return (
                            <div
                                key={index}
                                className="border rounded-md p-2 flex items-center gap-2 hover:bg-accent/20 transition-colors"
                            >
                                <div className="h-18 w-18 min-w-16 rounded-md overflow-hidden bg-accent flex items-center justify-center">
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
                                                        const div = document.createElement("div")
                                                        div.className =
                                                            "h-full w-full flex items-center justify-center"
                                                        div.appendChild(getFileIcon(file.name) as unknown as Node)
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
                                    <p className="text-sm font-medium truncate" title={file.name}>
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{file.type}</p>
                                    <div className="flex gap-1 mt-1">
                                        {canPreview && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 px-2 text-xs text-primary"
                                                onClick={() => handleOpenPreview(file)}
                                            >
                                                <Eye className="h-3 w-3 mr-1" />
                                                {tFiles("view")}
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
                                                "h-6 px-2 text-xs",
                                            )}
                                        >
                                            <Download className="h-3 w-3 mr-1" />
                                            {tFiles("download")}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>,
            )
        }

        // Default fallback for unexpected types
        return wrapWithLabel(<span>{JSON.stringify(characteristic.value)}</span>)
    }

    return (
        <div className="flex flex-col w-full">
            {renderValue()}

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
}

export default CharacteristicDisplay
