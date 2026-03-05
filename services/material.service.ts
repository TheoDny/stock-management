import { NotFoundMaterialError } from "@/errors/NotFoundMaterialError"
import { materialCacheTag } from "@/lib/material-cache-tags"
import { prisma } from "@/lib/prisma"
import { FileDb, Material, Material_Characteristic } from "@/prisma/generated/client"
import { addMaterialCreateLog, addMaterialUpdateLog } from "@/services/log.service"
import { createMaterialHistory } from "@/services/material-history.service"
import { saveFile } from "@/services/storage.service"
import { MaterialCharacteristic } from "@/types/characteristic.type"
import { cacheTag, revalidatePath, revalidateTag } from "next/cache"

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

const revalidateMaterialCache = (entityId: string, materialId: string) => {
    revalidateTag(materialCacheTag.materialList(entityId), "max")
    revalidateTag(materialCacheTag.materialById(materialId), "max")
    revalidateTag(materialCacheTag.materialCharacteristics(materialId), "max")
    revalidateTag(materialCacheTag.materialHistory(materialId), "max")
}

// Get all materials with their tags
export async function getMaterials(entityId: string) {
    "use cache"
    cacheTag(materialCacheTag.materialList(entityId))

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
    "use cache"
    cacheTag(materialCacheTag.materialById(id))

    const material = await prisma.material.findUnique({
        where: { id },
    })

    return material
}

// Get material characteristics
export async function getMaterialCharacteristics(materialId: string): Promise<MaterialCharacteristic[]> {
    "use cache"
    cacheTag(materialCacheTag.materialCharacteristics(materialId))

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
    const material = await prisma.$transaction(async (tx) => {
        const createdMaterial = await tx.material.create({
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

        if (data.characteristicValues.length > 0) {
            for (const cv of data.characteristicValues) {
                let isFile = false
                const fileDbIds: string[] = []

                if (
                    cv.value &&
                    typeof cv.value === "object" &&
                    "fileToAdd" in cv.value &&
                    Array.isArray(cv.value.fileToAdd)
                ) {
                    isFile = true
                    if (process.env.NEXT_PUBLIC_STORAGE_ENABLED === "true") {
                        for (const file of cv.value.fileToAdd) {
                            if (file instanceof File) {
                                const savedFile = await saveFile(
                                    file,
                                    `materials/${createdMaterial.id}/characteristics/${cv.characteristicId}`,
                                    materialImageMaxWidth,
                                )

                                fileDbIds.push(savedFile.id)
                            }
                        }
                    }
                }

                if (isFile) {
                    if (process.env.NEXT_PUBLIC_STORAGE_ENABLED === "true") {
                        await tx.material_Characteristic.create({
                            data: {
                                materialId: createdMaterial.id,
                                characteristicId: cv.characteristicId,
                                value: undefined,
                                File: {
                                    connect: fileDbIds.map((id) => ({ id })),
                                },
                            },
                        })
                    }
                } else {
                    await tx.material_Characteristic.create({
                        data: {
                            materialId: createdMaterial.id,
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

        return createdMaterial
    })

    // Create material history entry
    await createMaterialHistory(material.id)

    revalidateMaterialCache(entityId, material.id)

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
    const { material, materialNameForLog } = await prisma.$transaction(async (tx) => {
        const currentMaterial = await tx.material.findUnique({
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

        const updatedMaterial = await tx.material.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description || "",
                updatedAt: new Date(),
                Tags: {
                    set: data.tagIds.map((id) => ({ id })),
                },
                Characteristics: {
                    set: data.orderCharacteristics.map((characteristicId) => ({ id: characteristicId })),
                },
                order_Material_Characteristic: data.orderCharacteristics,
            },
        })

        const fileIdsToDelete: string[] = []
        for (const mc of currentMaterial.Material_Characteristics) {
            if (mc.File.length > 0) {
                const characteristicUpdate = data.characteristicValues.find(
                    (cv) => cv.characteristicId === mc.characteristicId,
                )

                if (
                    characteristicUpdate &&
                    characteristicUpdate.value &&
                    typeof characteristicUpdate.value === "object" &&
                    "fileToDelete" in characteristicUpdate.value
                ) {
                    fileIdsToDelete.push(...characteristicUpdate.value.fileToDelete)
                } else {
                    fileIdsToDelete.push(...mc.File.map((f: FileDb) => f.id))
                }
            }
        }

        if (fileIdsToDelete.length > 0) {
            await tx.fileDb.deleteMany({
                where: {
                    id: {
                        in: [...new Set(fileIdsToDelete)],
                    },
                },
            })
        }

        await tx.material_Characteristic.deleteMany({
            where: {
                materialId: id,
            },
        })

        if (data.characteristicValues.length > 0) {
            for (const cv of data.characteristicValues) {
                let isFile = false
                let processedValue: any = null
                const fileDbIds: string[] = []

                if (
                    cv.value &&
                    typeof cv.value === "object" &&
                    "fileToAdd" in cv.value &&
                    "fileToDelete" in cv.value
                ) {
                    isFile = true
                    if (process.env.NEXT_PUBLIC_STORAGE_ENABLED === "true") {
                        const existingCharacteristic = currentMaterial.Material_Characteristics.find(
                            (mc) => mc.characteristicId === cv.characteristicId,
                        )

                        if (existingCharacteristic && existingCharacteristic.File.length > 0) {
                            const filesToDelete: string[] = cv.value.fileToDelete
                            const filesToKeep = existingCharacteristic.File.filter(
                                (file) => !filesToDelete.includes(file.id),
                            )

                            fileDbIds.push(...filesToKeep.map((f) => f.id))
                        }

                        for (const file of cv.value.fileToAdd) {
                            if (file instanceof File) {
                                const savedFile = await saveFile(
                                    file,
                                    `materials/${updatedMaterial.id}/characteristics/${cv.characteristicId}`,
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

                if (isFile && fileDbIds.length > 0) {
                    if (process.env.NEXT_PUBLIC_STORAGE_ENABLED === "true") {
                        await tx.material_Characteristic.create({
                            data: {
                                materialId: id,
                                characteristicId: cv.characteristicId,
                                value: undefined,
                                File: {
                                    connect: fileDbIds.map((fileId) => ({ id: fileId })),
                                },
                            },
                        })
                    }
                } else {
                    await tx.material_Characteristic.create({
                        data: {
                            materialId: id,
                            characteristicId: cv.characteristicId,
                            value: processedValue,
                        },
                    })
                }
            }
        }

        return { material: updatedMaterial, materialNameForLog: currentMaterial.name }
    })

    // Create material history entry
    await createMaterialHistory(material.id)

    revalidateMaterialCache(entityId, material.id)

    // Add log
    addMaterialUpdateLog({ id: material.id, name: materialNameForLog }, entityId)

    revalidatePath("/materials")
    return material
}
