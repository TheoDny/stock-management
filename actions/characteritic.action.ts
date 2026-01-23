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
        .min(2, "name.min")
        .max(64, "name.max"),
    description: z.string().trim().max(255, "description.max").optional(),
    type: z.enum(CharacteristicType),
    options: z.array(z.string().trim()).nullable(),
    units: z.string().trim().nullable(),
})

// Schema for updating a characteristic
const updateCharacteristicSchema = z.object({
    id: z.string().catch("id"),
    name: z
        .string()
        .trim()
        .min(2, "name.min")
        .max(64, "name.max"),
    description: z.string().trim().max(255, "description.max"),
    options: z.array(z.string().trim()).nullable().optional(),
})

const deleteCharacteristicSchema = z.object({
    id: z.string().catch("id"),
})

// Get all characteristics
export async function getCharacteristicsAction() {
    // Basic auth check
    const session = await checkAuth()

    return await getCharacteristics(session.user.entitySelectedId)
}

// Create a new characteristic
export const createCharacteristicAction = actionClient
    .inputSchema(createCharacteristicSchema)
    .action(async ({ parsedInput }) => {
        const session = await checkAuth({ requiredPermission: "characteristic_create" })

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
    })

// Update an existing characteristic
export const updateCharacteristicAction = actionClient
    .inputSchema(updateCharacteristicSchema)
    .action(async ({ parsedInput }) => {
        const session = await checkAuth({ requiredPermission: "characteristic_edit" })

        const { id, name, description, options } = parsedInput

        return await updateCharacteristic(id, session.user.entitySelectedId, {
            name,
            description,
            options: options ?? undefined,
        })
    })

export const deleteCharacteristicAction = actionClient
    .inputSchema(deleteCharacteristicSchema)
    .action(async ({ parsedInput }) => {
        const session = await checkAuth({ requiredPermission: "characteristic_create" })

        const { id } = parsedInput

        return await deleteCharacteristic(id, session.user.entitySelectedId)
    })
