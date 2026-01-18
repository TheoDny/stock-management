"use server"

import { checkAuth } from "@/lib/auth-guard"
import { actionClient } from "@/lib/safe-action"
import { createTag, deleteTag, getTags, updateTag } from "@/services/tag.service"
import { z } from "zod"

// Schema for creating a tag
const createTagSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(64, "Name must be at most 64 characters"),
    color: z.string().trim().max(7, "Color must be a valid hex color code"),
    fontColor: z.string().trim().max(7, "Font color must be a valid hex color code"),
})

// Schema for updating a tag
const updateTagSchema = z.object({
    id: z.string().trim(),
    name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(64, "Name must be at most 64 characters"),
    color: z.string().trim().max(7, "Color must be a valid hex color code"),
    fontColor: z.string().trim().max(7, "Font color must be a valid hex color code"),
})

const deleteTagSchema = z.object({
    id: z.string().trim(),
})

// Get all tags with material count
export async function getTagsAction() {
    try {
        // Auth check for basic session validation
        const session = await checkAuth()

        const tags = await getTags(session.user.entitySelectedId)
        return tags
    } catch (error) {
        console.error("Failed to fetch tags:", error)
        throw new Error("Failed to fetch tags")
    }
}

// Create a new tag
export const createTagAction = actionClient.schema(createTagSchema).action(async ({ parsedInput }) => {
    try {
        // Check for tag_create permission
        const session = await checkAuth({ requiredPermission: "tag_create" })

        return await createTag({
            ...parsedInput,
            entityId: session.user.entitySelectedId,
        })
    } catch (error) {
        console.error("Failed to create tag:", error)
        throw new Error("Failed to create tag")
    }
})

// Update an existing tag
export const updateTagAction = actionClient.schema(updateTagSchema).action(async ({ parsedInput }) => {
    try {
        // Check for tag_edit permission
        const session = await checkAuth({ requiredPermission: "tag_edit" })

        const { id, name, color, fontColor } = parsedInput

        const tag = await updateTag(id, session.user.entitySelectedId, {
            name,
            color,
            fontColor,
        })

        return tag
    } catch (error) {
        console.error("Failed to update tag:", error)
        throw new Error("Failed to update tag")
    }
})

// Delete a tag
export const deleteTagAction = actionClient.schema(deleteTagSchema).action(async ({ parsedInput }) => {
    try {
        // Check for tag_create permission (same as creating since it's a destructive action)
        const session = await checkAuth({ requiredPermission: "tag_create" })

        const { id } = parsedInput

        return await deleteTag(id, session.user.entitySelectedId)
    } catch (error) {
        console.error("Failed to delete tag:", error)
        throw new Error("Failed to delete tag")
    }
})
