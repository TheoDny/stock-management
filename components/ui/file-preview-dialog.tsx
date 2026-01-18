"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, File, Loader2, X } from "lucide-react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { useEffect, useState } from "react"

interface FilePreviewDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    fileUrl: string
    fileName: string
    fileType?: string
}

export function FilePreviewDialog({ open, onOpenChange, fileUrl, fileName, fileType }: FilePreviewDialogProps) {
    const t = useTranslations("Materials.files")
    const tCommon = useTranslations("Common")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [textContent, setTextContent] = useState<string | null>(null)

    // Get file extension from filename
    const fileExtension = fileName.split(".").pop()?.toLowerCase() || ""

    // Determine file content type
    const isImage = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(fileExtension)
    const isPdf = fileExtension === "pdf"
    const isTextFile = ["txt", "csv", "json", "md", "xml", "html", "css", "js"].includes(fileExtension)

    useEffect(() => {
        if (!open) return

        // Reset state when dialog opens
        setLoading(true)
        setError(null)
        setTextContent(null)

        // Load text content for text files
        if (isTextFile) {
            fetch(fileUrl)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`)
                    }
                    return response.text()
                })
                .then((text) => {
                    setTextContent(text)
                    setLoading(false)
                })
                .catch((err) => {
                    console.error("Error loading text file:", err)
                    setError(err.message)
                    setLoading(false)
                })
        } else {
            // For non-text files, just set loading to false
            setLoading(false)
        }
    }, [open, fileUrl, isTextFile])

    const renderPreview = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )
        }

        if (error) {
            return (
                <div className="flex items-center justify-center p-8 text-destructive">
                    <p>{error}</p>
                </div>
            )
        }

        if (isImage) {
            return (
                <div className="flex justify-center p-2">
                    <Image
                        src={fileUrl}
                        alt={fileName}
                        width={800}
                        height={600}
                        className="max-h-[70vh] object-scale-down"
                        style={{ width: "auto", height: "auto" }}
                        onError={() => setError("Failed to load image")}
                    />
                </div>
            )
        }

        if (isPdf) {
            return (
                <iframe
                    src={`${fileUrl}#toolbar=0&view=FitH`}
                    className="w-full h-[70vh]"
                    title={fileName}
                />
            )
        }

        if (isTextFile && textContent) {
            return <pre className="p-4 bg-muted rounded-md overflow-auto max-h-[70vh] text-sm">{textContent}</pre>
        }

        // Default view for unsupported file types
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <File className="h-16 w-16 text-muted-foreground" />
                <p className="text-center text-muted-foreground">{t("previewNotAvailable")}</p>
                <a
                    href={fileUrl}
                    download={fileName}
                    className="inline-flex items-center space-x-2 text-primary hover:underline"
                >
                    <Download className="h-4 w-4" />
                    <span>{t("download")}</span>
                </a>
            </div>
        )
    }

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                        <span>{fileName}</span>
                    </DialogTitle>
                    <DialogDescription>{fileType || ""}</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden">{renderPreview()}</div>

                <div className="flex justify-end mt-4">
                    <a
                        href={fileUrl}
                        download={fileName}
                        className="inline-flex items-center space-x-2 mr-4"
                    >
                        <Button variant="outline">
                            <Download className="h-4 w-4" />
                            {t("download")}
                        </Button>
                    </a>
                    <Button
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                    >
                        <X className="h-4 w-4" />
                        {tCommon("close")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
