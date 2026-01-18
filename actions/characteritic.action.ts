"use server"

import { checkAuth } from "@/lib/auth-guard"
import { actionClient } from "@/lib/safe-action"
import { CharacteristicType } from "@/prisma/generated/client"
import {
    createCharacteristic,
    deleteCharacteristic,
    getCharacteristics,
    updateCharacteristic,
} from "@/services/characteristic.service"
import { z } from "zod"

// Schema for creating a characteristic
const createCharacteristicSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(64, "Name must be at most 64 characters"),
    description: z.string().trim().max(255, "Description must be at most 255 characters").optional(),
    type: z.enum(CharacteristicType),
    options: z.array(z.string().trim()).nullable(),
    units: z.string().trim().nullable(),
})

// Schema for updating a characteristic
const updateCharacteristicSchema = z.object({
    id: z.string(),
    name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(64, "Name must be at most 64 characters"),
    description: z.string().trim().max(255, "Description must be at most 255 characters"),
})

const deleteCharacteristicSchema = z.object({
    id: z.string(),
})

// Get all characteristics
export async function getCharacteristicsAction() {
    try {
        // Basic auth check
        const session = await checkAuth()

        return await getCharacteristics(session.user.entitySelectedId)
    } catch (error) {
        console.error("Failed to fetch characteristics:", error)
        throw new Error("Failed to fetch characteristics")
    }
}

// Create a new characteristic
export const createCharacteristicAction = actionClient
    .schema(createCharacteristicSchema)
    .action(async ({ parsedInput }) => {
        try {
            const session = await checkAuth({ requiredPermission: "charac_create" })

            const { name, description, type, options, units } = parsedInput

            const characteristic = await createCharacteristic({
                name,
                description: description || "",
                type,
                options,
                units,
                entityId: session.user.entitySelectedId,
            })

            return characteristic
        } catch (error) {
            console.error("Failed to create characteristic:", error)
            throw new Error("Failed to create characteristic")
        }
    })

// Update an existing characteristic
export const updateCharacteristicAction = actionClient
    .schema(updateCharacteristicSchema)
    .action(async ({ parsedInput }) => {
        try {
            const session = await checkAuth({ requiredPermission: "charac_edit" })

            const { id, name, description } = parsedInput

            return await updateCharacteristic(id, session.user.entitySelectedId, {
                name,
                description,
            })
        } catch (error) {
            console.error("Failed to update characteristic:", error)
            throw new Error("Failed to update characteristic")
        }
    })

export const deleteCharacteristicAction = actionClient
    .schema(deleteCharacteristicSchema)
    .action(async ({ parsedInput }) => {
        try {
            const session = await checkAuth({ requiredPermission: "charac_create" })

            const { id } = parsedInput

            return await deleteCharacteristic(id, session.user.entitySelectedId)
        } catch (error) {
            console.error("Failed to delete characteristic:", error)
            throw new Error("Failed to delete characteristic")
        }
    })
