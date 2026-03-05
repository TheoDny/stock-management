import { InvalidStoragePathError } from "@/errors/InvalidStoragePathError"
import jwt from "jsonwebtoken"
import path from "path"

export function generateInviteToken(name: string, email: string, expiresAt: Date): string {
    const payload = {
        name,
        email,
        exp: expiresAt.getTime() / 1000, // Convert to seconds
    }

    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is required in configuration server")
    }

    return jwt.sign(payload, process.env.JWT_SECRET)
}

/**
 * Resolves and validates a user-provided relative path under the storage root.
 * Throws InvalidStoragePathError for traversal attempts or invalid segments.
 */
export function resolveStorageFilePath(filePath: string, storage_root: string): string {
    const normalizedInput = filePath.replace(/\\/g, "/").trim()

    if (!normalizedInput) {
        throw new InvalidStoragePathError()
    }

    const segments = normalizedInput.split("/").filter(Boolean)

    if (segments.length === 0 || segments.some((segment) => segment === "." || segment === "..")) {
        throw new InvalidStoragePathError()
    }

    const absolutePath = path.resolve(storage_root, ...segments)
    const relativeToStorageRoot = path.relative(storage_root, absolutePath)

    if (relativeToStorageRoot.startsWith("..") || path.isAbsolute(relativeToStorageRoot)) {
        throw new InvalidStoragePathError()
    }

    return absolutePath
}
