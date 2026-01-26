import { NotFoundMaterialError } from "@/errors/NotFoundMaterialError"
import { prisma } from "@/lib/prisma"
import { FileDb, Material, Material_Characteristic } from "@/prisma/generated/client"
import { addMaterialCreateLog, addMaterialUpdateLog } from "@/services/log.service"
import { createMaterialHistory } from "@/services/material-history.service"
import { deleteFiles, saveFile } from "@/services/storage.service"
import { MaterialCharacteristic } from "@/types/characteristic.type"
import { revalidatePath } from "next/cache"

type CreateCharacteristicValueInput = {
    characteristicId: string
    value?:
        | null
        | string[]
        | string
        | boolean
        | { date: Date }
        | { from: Date; to: Date }
        | { fileToAdd: File[] }
        | { multiText: { title: string; text: string }[] }
        | { [key: string]: boolean }[]
}

type UpdateCharacteristicValueInput = {
    characteristicId: string
    value?:
        | null
        | string[]
        | string
        | boolean
        | { date: Date }
        | { from: Date; to: Date }
        | { fileToDelete: string[]; fileToAdd: File[] }
        | { multiText: { title: string; text: string }[] }
        | { [key: string]: boolean }[]
}

type MaterialWithMaterialCharacteristics = Material & {
    Material_Characteristics: (Material_Characteristic & {
        File: FileDb[]
    })[]
}

const materialImageMaxWidth = { imgMaxWidth: 720, imgMaxHeight: 720 }

// Get all materials with their tags
export async function getMaterials(entityId: string) {
    const materials = await prisma.material.findMany({
        where: {
            entityId,
            deletedAt: null,
        },
        include: {
            Tags: true,
        },
        orderBy: {
            updatedAt: "desc",
        },
    })

    return materials
}

// Get material by ID
export async function getMaterialById(id: string) {
    const material = await prisma.material.findUnique({
        where: { id },
    })

    return material
}

// Get material characteristics
export async function getMaterialCharacteristics(materialId: string): Promise<MaterialCharacteristic[]> {
    const characteristicValues = await prisma.material_Characteristic.findMany({
        where: {
            materialId,
        },
        include: {
            Characteristic: true,
            File: {
                select: {
                    id: true,
                    name: true,
                    type: true,
                },
            },
        },
    })

    return characteristicValues as MaterialCharacteristic[]
}

// Create a new material
export async function createMaterial(
    entityId: string,
    data: {
        name: string
        description: string
        tagIds: string[]
        orderCharacteristics: string[]
        characteristicValues: CreateCharacteristicValueInput[]
    },
) {
        // Create the material
        const material = await prisma.material.create({
            data: {
                name: data.name,
                description: data.description || "",
                Tags: {
                    connect: data.tagIds.map((id) => ({ id })),
                },
                Characteristics: {
                    connect: data.orderCharacteristics.map((characteristicId) => ({ id: characteristicId })),
                },
                order_Material_Characteristic: data.orderCharacteristics,
                entityId: entityId,
            },
        })

        // Create material characteristics
        if (data.characteristicValues.length > 0) {
            for (const cv of data.characteristicValues) {
                let isFile = false
                let fileDbIds: string[] = []

                // Check if value is a file upload object
                if (
                    cv.value &&
                    typeof cv.value === "object" &&
                    "fileToAdd" in cv.value &&
                    Array.isArray(cv.value.fileToAdd)
                ) {
                    isFile = true
                    if (process.env.NEXT_PUBLIC_STORAGE_ENABLED === "true") {
                        // Process each file in the array
                        for (const file of cv.value.fileToAdd) {
                            if (file instanceof File) {
                                // Save file using storage service
                                const savedFile = await saveFile(
                                    file,
                                    `materials/${material.id}/characteristics/${cv.characteristicId}`,
                                    materialImageMaxWidth,
                                )
    
                                fileDbIds.push(savedFile.id)
                            }
                        }
                    }
                }

                // Create the characteristic value
                if (isFile) {
                    if (process.env.NEXT_PUBLIC_STORAGE_ENABLED === "true") {
                        await prisma.material_Characteristic.create({
                            data: {
                                materialId: material.id,
                                characteristicId: cv.characteristicId,
                                value: undefined,
                                File: {
                                    connect: fileDbIds.map((id) => ({ id })),
                                },
                            },
                        })
                    }
                } else {
                    await prisma.material_Characteristic.create({
                        data: {
                            materialId: material.id,
                            characteristicId: cv.characteristicId,
                            value: cv.value as
                                | string[]
                                | string
                                | boolean
                                | { date: Date }
                                | { from: Date; to: Date }
                                | { multiText: { title: string; text: string }[] },
                        },
                    })
                }
            }
        }

        // Create material history entry
        createMaterialHistory(material.id)

        // Add log
        addMaterialCreateLog({ id: material.id, name: material.name }, entityId)

        revalidatePath("/materials")
        return material
}

// Update an existing material
export async function updateMaterial(
    id: string,
    entityId: string,
    data: {
        name: string
        description: string
        tagIds: string[]
        orderCharacteristics: string[]
        characteristicValues: UpdateCharacteristicValueInput[]
    },
) {
        // Get current material to determine if version should be incremented
        const currentMaterial = await prisma.material.findUnique({
            where: { id, entityId },
            include: {
                Tags: true,
                Material_Characteristics: {
                    include: {
                        File: true,
                    },
                },
            },
        })

        if (!currentMaterial) {
            throw new NotFoundMaterialError("Material not found")
        }

        // Update the material
        const material = await prisma.material.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description || "",
                updatedAt: new Date(),
                Tags: {
                    set: data.tagIds.map((id) => ({ id })), // Add new tags
                },
                Characteristics: {
                    set: data.orderCharacteristics.map((characteristicId) => ({ id: characteristicId })), // Add new characteristics
                },
                order_Material_Characteristic: data.orderCharacteristics,
            },
        })

        // Update material characteristics
        // First, remove all existing characteristics
        for (const mc of currentMaterial.Material_Characteristics) {
            // For file type characteristics, we need to delete the actual files if needed
            if (mc.File.length > 0) {
                // Keep track of file IDs to delete
                const fileIdsToDelete: string[] = []

                // Check if this characteristic is being updated with a file deletion
                const characteristicUpdate = data.characteristicValues.find(
                    (cv) => cv.characteristicId === mc.characteristicId,
                )

                if (
                    characteristicUpdate &&
                    characteristicUpdate.value &&
                    typeof characteristicUpdate.value === "object" &&
                    "fileToDelete" in characteristicUpdate.value
                ) {
                    // Add specified files to the delete list
                    fileIdsToDelete.push(...characteristicUpdate.value.fileToDelete)
                } else {
                    // If the characteristic is removed or completely replaced,
                    // all files need to be deleted
                    fileIdsToDelete.push(...mc.File.map((f: FileDb) => f.id))
                }

                // Delete the files that need to be removed
                if (fileIdsToDelete.length > 0) {
                    await deleteFiles(fileIdsToDelete, true) // Only delete from DB (for history purpose)
                }
            }
        }

        // Delete all existing material characteristics
        await prisma.material_Characteristic.deleteMany({
            where: {
                materialId: id,
            },
        })

        // Then, add the new characteristics
        if (data.characteristicValues.length > 0) {
            for (const cv of data.characteristicValues) {
                let isFile = false
                let processedValue: any = null
                let fileDbIds: string[] = []

                // Check if value is a file upload object for updating
                if (
                    cv.value &&
                    typeof cv.value === "object" &&
                    "fileToAdd" in cv.value &&
                    "fileToDelete" in cv.value
                ) {
                    isFile = true
                    if (process.env.NEXT_PUBLIC_STORAGE_ENABLED === "true") {
                        // Find existing characteristic to get current files
                        const existingCharacteristic = currentMaterial.Material_Characteristics.find(
                            (mc) => mc.characteristicId === cv.characteristicId,
                        )

                        // Keep files that shouldn't be deleted
                        if (existingCharacteristic && existingCharacteristic.File.length > 0) {
                            const filesToDelete: string[] = cv.value.fileToDelete
                            const filesToKeep = existingCharacteristic.File.filter(
                                (file) => !filesToDelete.includes(file.id),
                            )

                            // Add IDs of files to keep
                            fileDbIds.push(...filesToKeep.map((f) => f.id))
                        }

                        // Process new files to add
                        for (const file of cv.value.fileToAdd) {
                            if (file instanceof File) {
                                // Save file using storage service
                                const savedFile = await saveFile(
                                    file,
                                    `materials/${material.id}/characteristics/${cv.characteristicId}`,
                                    materialImageMaxWidth,
                                )

                                fileDbIds.push(savedFile.id)
                            }
                        }
                    }
                }

                if (!isFile) {
                    processedValue = cv.value as
                        | null
                        | string[]
                        | string
                        | boolean
                        | { date: Date }
                        | { from: Date; to: Date }
                }

                // Create the characteristic value with updated data
                if (isFile && fileDbIds.length > 0) {
                    if (process.env.NEXT_PUBLIC_STORAGE_ENABLED === "true") {
                        await prisma.material_Characteristic.create({
                            data: {
                                materialId: id,
                                characteristicId: cv.characteristicId,
                                value: undefined,
                                File: {
                                    connect: fileDbIds.map((id) => ({ id })),
                                },
                            },
                        })
                    }
                } else {
                    await prisma.material_Characteristic.create({
                        data: {
                            materialId: id,
                            characteristicId: cv.characteristicId,
                            value: processedValue,
                        },
                    })
                }
            }
        }

        // Create material history entry
        createMaterialHistory(material.id)

        // Add log
        addMaterialUpdateLog({ id: material.id, name: currentMaterial.name }, entityId)

        revalidatePath("/materials")
        return material
}
