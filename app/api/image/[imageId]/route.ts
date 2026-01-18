import { getFileById } from "@/services/storage.service"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ imageId: string }> }) {
    try {
        const imageId = (await params).imageId

        if (!imageId) {
            return new NextResponse("Image ID is required", { status: 400 })
        }

        // Get the file from storage service
        const file = await getFileById(imageId)

        if (!file || !file.data) {
            return new NextResponse("Image not found", { status: 404 })
        }

        // Convert the data to a Buffer if needed
        const buffer = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data)

        // Determine the content type based on file information
        const contentType = file.type || determineContentType(file.name || "")

        // Create the response with proper headers
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `inline; filename="${file.name || imageId}"`,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        })
    } catch (error) {
        console.error("Error serving image:", error)
        return new NextResponse("Error serving image", { status: 500 })
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
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ppt: "application/vnd.ms-powerpoint",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        txt: "text/plain",
        csv: "text/csv",
    }

    return mimeTypes[extension] || "application/octet-stream"
}
