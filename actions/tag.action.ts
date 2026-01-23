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
        .min(2, "name.min")
        .max(64, "name.max"),
    color: z.string().trim().length(7, "color"),
    fontColor: z.string().trim().length(7, "fontColor"),
})

// Schema for updating a tag
const updateTagSchema = z.object({
    id: z.string().trim(),
    name: z
        .string()
        .trim()
        .min(2, "name.min")
        .max(64, "name.max"),
    color: z.string().trim().length(7).catch("color"),
    fontColor: z.string().trim().length(7).catch("fontColor"),
})

const deleteTagSchema = z.object({
    id: z.string().trim().catch("id"),
})

// Get all tags with material count
export async function getTagsAction() {
    // Auth check for basic session validation
    const session = await checkAuth()

    const tags = await getTags(session.user.entitySelectedId)
    return tags
}

// Create a new tag
export const createTagAction = actionClient.schema(createTagSchema).action(async ({ parsedInput }) => {
    // Check for tag_create permission
    const session = await checkAuth({ requiredPermission: "tag_create" })

    return await createTag({
        ...parsedInput,
        entityId: session.user.entitySelectedId,
    })
})

// Update an existing tag
export const updateTagAction = actionClient.schema(updateTagSchema).action(async ({ parsedInput }) => {
    // Check for tag_edit permission
    const session = await checkAuth({ requiredPermission: "tag_edit" })

    const { id, name, color, fontColor } = parsedInput

    const tag = await updateTag(id, session.user.entitySelectedId, {
        name,
        color,
        fontColor,
    })

    return tag
})

// Delete a tag
export const deleteTagAction = actionClient.schema(deleteTagSchema).action(async ({ parsedInput }) => {
    // Check for tag_create permission (same as creating since it's a destructive action)
    const session = await checkAuth({ requiredPermission: "tag_create" })

    const { id } = parsedInput

    return await deleteTag(id, session.user.entitySelectedId)
})
