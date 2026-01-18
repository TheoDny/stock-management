import { getFileByPath } from "@/services/storage.service"
import { NextRequest, NextResponse } from "next/server"

const STORAGE_PATH = process.env.STORAGE_PATH || "./storage"

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    try {
        // Get path segments and join them
        const pathSegments = (await params).path || []

        if (pathSegments.length === 0) {
            return new NextResponse("File path is required", { status: 400 })
        }

        // Sanitize path to prevent directory traversal attacks
        const fullPath = pathSegments.join("/")

        // Get the file from storage service
        const fileData = await getFileByPath(fullPath)

        if (!fileData) {
            return new NextResponse("File not found", { status: 404 })
        }

        // Convert the data to a Buffer if needed
        const buffer = Buffer.isBuffer(fileData) ? fileData : Buffer.from(fileData)

        // Extract filename from path to determine content type
        const filename = pathSegments[pathSegments.length - 1]

        // Determine the content type based on file information
        const contentType = determineContentType(filename)

        // Create the response with proper headers
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `inline; filename="${filename}"`,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        })
    } catch (error) {
        console.error("Error serving file:", error)
        return new NextResponse("Error serving file", { status: 500 })
    }
}

// Helper function to determine content type from filename
function determineContentType(filename: string): string {
    const extension = filename.split(".").pop()?.toLowerCase() || ""

    const mimeTypes: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        bmp: "image/bmp",
        svg: "image/svg+xml",
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ppt: "application/vnd.ms-powerpoint",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        txt: "text/plain",
        csv: "text/csv",
        json: "application/json",
        xml: "application/xml",
        html: "text/html",
        css: "text/css",
        js: "application/javascript",
        mp3: "audio/mpeg",
        wav: "audio/wav",
        mp4: "video/mp4",
        mov: "video/quicktime",
        avi: "video/x-msvideo",
        zip: "application/zip",
        rar: "application/x-rar-compressed",
        tar: "application/x-tar",
        gz: "application/gzip",
        "7z": "application/x-7z-compressed",
    }

    return mimeTypes[extension] || "application/octet-stream"
}
