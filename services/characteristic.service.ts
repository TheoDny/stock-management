import { prisma } from "@/lib/prisma"
import { Characteristic, CharacteristicType } from "@/prisma/generated/client"
import {
    addCharacteristicCreateLog,
    addCharacteristicDeleteLog,
    addCharacteristicUpdateLog,
} from "@/services/log.service"
import { createMaterialHistory } from "@/services/material-history.service"
import { revalidatePath } from "next/cache"

type CharacteristicCreateData = {
    name: string
    description: string
    type: CharacteristicType
    options: any
    units: string | null
    entityId: string
}

type CharacteristicUpdateData = {
    name: string
    description: string
    options?: string[] | null
}

// Get all characteristics with material count
export async function getCharacteristics(entityId: string) {
    try {
        const characteristics = await prisma.characteristic.findMany({
            where: {
                entityId,
            },
            include: {
                _count: {
                    select: { Materials: true },
                },
            },
            orderBy: {
                name: "asc",
            },
        })

        return characteristics
    } catch (error) {
        console.error("Failed to fetch characteristics:", error)
        throw new Error("Failed to fetch characteristics")
    }
}

// Create a new characteristic
export async function createCharacteristic(data: CharacteristicCreateData): Promise<Characteristic> {
    try {
        const characteristic = await prisma.characteristic.create({
            data: {
                name: data.name,
                description: data.description || "",
                type: data.type,
                options: data.options,
                units: data.units,
                entityId: data.entityId,
            },
        })

        // Add log
        addCharacteristicCreateLog({ id: characteristic.id, name: characteristic.name }, data.entityId)

        revalidatePath("/configuration/characteristics")
        return characteristic
    } catch (error) {
        console.error("Failed to create characteristic:", error)
        throw new Error("Failed to create characteristic")
    }
}

// Update an existing characteristic
export async function updateCharacteristic(
    id: string,
    entityId: string,
    param: CharacteristicUpdateData,
): Promise<Characteristic> {
    try {
        // First get the characteristic to access its name
        const existingCharacteristic = await prisma.characteristic.findUnique({
            where: { id },
            include: {
                Materials: {
                    where: {
                        deletedAt: null,
                    },
                    select: {
                        id: true,
                    },
                },
            },
        })

        if (!existingCharacteristic) {
            throw new Error("Characteristic not found")
        }

        // Prepare update data
        const updateData: {
            name: string
            description: string
            options?: any
        } = {
            name: param.name,
            description: param.description,
        }

        // Get existing options as array for comparison
        const existingOptions = Array.isArray(existingCharacteristic.options)
            ? existingCharacteristic.options
            : existingCharacteristic.options
                ? [existingCharacteristic.options]
                : []

        // Handle options update if provided
        if (param.options != undefined) {
            // Merge existing options with new ones
            // Keep all existing options (they can be modified but not removed)
            // Add new options that don't exist yet
            const updatedOptions = [...existingOptions]

            // Update existing options with new values and add new ones
            param.options.forEach((newOption) => {
                const trimmedOption = newOption.trim()
                if (trimmedOption && !updatedOptions.includes(trimmedOption)) {
                    updatedOptions.push(trimmedOption)
                }
            })

            updateData.options = updatedOptions.length > 0 ? updatedOptions : null
        }

        // Check if name or description changed
        const nameChanged = existingCharacteristic.name !== param.name
        const descriptionChanged = existingCharacteristic.description !== param.description

        // Check if any existing option was modified (not just new ones added)
        // An existing option is considered modified if it's no longer in the new options list
        // (meaning its value was changed)
        let existingOptionModified = false
        if (param.options != undefined && existingOptions.length > 0) {
            const newOptionsSet = new Set(param.options.map((opt) => opt.trim()))
            
            // Check if any existing option is missing from the new options
            // This means it was modified (changed to a different value)
            existingOptionModified = existingOptions.some((existingOpt) => {
                const existingOptStr = String(existingOpt).trim()
                return !newOptionsSet.has(existingOptStr)
            })
        }

        // Check if there is really any change
        const optionsChanged =
            param.options !== undefined &&
            JSON.stringify(existingCharacteristic.options) !== JSON.stringify(updateData.options)

        if (
            !nameChanged &&
            !descriptionChanged &&
            !optionsChanged
        ) {
            const { Materials, ...char } = existingCharacteristic
            return char
        }

        const characteristic = await prisma.characteristic.update({
            where: {
                id,
                entityId,
            },
            data: updateData,
        })

        // Generate material history ONLY if name, description, or existing options were modified
        // NOT if only new options were added
        const shouldGenerateHistory = nameChanged || descriptionChanged || existingOptionModified

        if (shouldGenerateHistory && existingCharacteristic.Materials.length > 0) {
            existingCharacteristic.Materials.forEach((material) => {
                // No need to await, we can generate histories in the background
                createMaterialHistory(material.id)
            })
        }

        // Add log
        addCharacteristicUpdateLog({ id, name: characteristic.name }, entityId)

        revalidatePath("/configuration/characteristics")
        return characteristic
    } catch (error) {
        console.error("Failed to update characteristic:", error)
        throw new Error("Failed to update characteristic")
    }
}

// Delete a characteristic
export async function deleteCharacteristic(id: string, entityId: string): Promise<Characteristic> {
    try {
        // Check if the characteristic is used by any materials
        const materialCount = await prisma.material.count({
            where: {
                Characteristics: {
                    some: {
                        id,
                    },
                },
            },
        })

        if (materialCount > 0) {
            throw new Error("Cannot delete characteristic used by materials")
        }

        const characteristic = await prisma.characteristic.delete({
            where: {
                id,
                entityId,
            },
        })

        // Add log
        addCharacteristicDeleteLog({ id, name: characteristic.name }, entityId)

        revalidatePath("/configuration/characteristics")
        return characteristic
    } catch (error) {
        console.error("Failed to delete characteristic:", error)
        throw new Error("Failed to delete characteristic")
    }
}
