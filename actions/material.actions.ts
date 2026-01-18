"use server"

import { checkAuth } from "@/lib/auth-guard"
import { actionClient } from "@/lib/safe-action"
import {
    createMaterial,
    getMaterialById,
    getMaterialCharacteristics,
    getMaterials,
    updateMaterial,
} from "@/services/material.service"
import { z } from "zod"

// Schema for creating a material with file upload
const createMaterialSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    description: z.string().trim().max(255, "Description must be at most 255 characters").default(""),
    tagIds: z.array(z.string()).default([]),
    orderCharacteristics: z.array(z.string()).default([]),
    characteristicValues: z
        .array(
            z.object({
                characteristicId: z.string(),
                value: z
                    .union([
                        z.null(),
                        z.string(),
                        z.array(z.string()),
                        z.boolean(),
                        z.object({ date: z.date() }),
                        z.object({ from: z.date(), to: z.date() }),
                        z.object({
                            fileToAdd: z.array(z.instanceof(File)).default([]),
                        }),
                        z.object({
                            multiText: z.array(
                                z.object({
                                    title: z.string(),
                                    text: z.string(),
                                }),
                            ),
                        }),
                    ])
                    .optional(),
            }),
        )
        .default([]),
})

// Schema for updating a material
const updateMaterialSchema = z.object({
    id: z.string(),
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    description: z.string().trim().max(255, "Description must be at most 255 characters").default(""),
    tagIds: z.array(z.string()).default([]),
    orderCharacteristics: z.array(z.string()).default([]),
    characteristicValues: z
        .array(
            z.object({
                characteristicId: z.string(),
                value: z
                    .union([
                        z.null(),
                        z.string(),
                        z.array(z.string()),
                        z.boolean(),
                        z.object({ date: z.date() }),
                        z.object({ from: z.date(), to: z.date() }),
                        z.object({
                            fileToDelete: z.array(z.string()).default([]),
                            fileToAdd: z.array(z.instanceof(File)).default([]),
                        }),
                        z.object({
                            multiText: z.array(
                                z.object({
                                    title: z.string(),
                                    text: z.string(),
                                }),
                            ),
                        }),
                    ])
                    .optional(),
            }),
        )
        .default([]),
})

const getMaterialSchema = z.object({
    id: z.string(),
})

// Get all materials with their tags and characteristic count
export async function getMaterialsAction() {
    try {
        // Basic auth check
        const session = await checkAuth()

        return await getMaterials(session.user.entitySelectedId)
    } catch (error) {
        console.error("Failed to fetch materials:", error)
        throw new Error("Failed to fetch materials")
    }
}

export const getMaterialAction = actionClient.schema(getMaterialSchema).action(async ({ parsedInput }) => {
    try {
        // Basic auth check
        await checkAuth()

        return await getMaterialById(parsedInput.id)
    } catch (error) {
        console.error("Failed to fetch material:", error)
        throw new Error("Failed to fetch material")
    }
})

// Get material characteristics
export async function getMaterialCharacteristicsAction(materialId: string) {
    try {
        // Basic auth check
        await checkAuth()

        return await getMaterialCharacteristics(materialId)
    } catch (error) {
        console.error("Failed to fetch material characteristics:", error)
        throw new Error("Failed to fetch material characteristics")
    }
}

// Create a new material
export const createMaterialAction = actionClient.schema(createMaterialSchema).action(async ({ parsedInput }) => {
    try {
        // We need a custom permission code for materials, but for now we'll use tag_create
        const session = await checkAuth({ requiredPermission: "material_create" })

        return await createMaterial(session.user.entitySelectedId, {
            name: parsedInput.name,
            description: parsedInput.description || "",
            tagIds: parsedInput.tagIds,
            characteristicValues: parsedInput.characteristicValues,
            orderCharacteristics: parsedInput.orderCharacteristics,
        })
    } catch (error) {
        console.error("Failed to create material:", error)
        throw new Error("Failed to create material")
    }
})

// Update an existing material
export const updateMaterialAction = actionClient.schema(updateMaterialSchema).action(async ({ parsedInput }) => {
    try {
        // We need a custom permission code for materials, but for now we'll use tag_edit
        const session = await checkAuth({ requiredPermission: "tag_edit" })

        const { id, name, description, tagIds, characteristicValues, orderCharacteristics } = parsedInput

        return await updateMaterial(id, session.user.entitySelectedId, {
            name,
            description: description || "",
            tagIds,
            characteristicValues,
            orderCharacteristics,
        })
    } catch (error) {
        console.error("Failed to update material:", error)
        throw new Error("Failed to update material")
    }
})
