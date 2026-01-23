import { DeleteTagUsedByMaterialsError } from "@/errors/DeleteTagUsedByMaterialsError"
import { NotFoundTagError } from "@/errors/NotFoundTagError"
import { prisma } from "@/lib/prisma"
import { addTagCreateLog, addTagDeleteLog, addTagUpdateLog } from "@/services/log.service"
import { createMaterialHistory } from "@/services/material-history.service"
import { revalidatePath } from "next/cache"

type TagUpdateData = {
    name?: string
    fontColor: string
    color: string
}

// Get all tags with material count
export async function getTags(entityId: string) {
        const tags = await prisma.tag.findMany({
            include: {
                _count: {
                    select: { Materials: true },
                },
            },
            where: {
                entityId,
            },
            orderBy: {
                name: "asc",
            },
        })

        return tags
}

// Create a new tag
export async function createTag(data: { name: string; fontColor: string; color: string; entityId: string }) {
        const tag = await prisma.tag.create({
            data,
        })

        // Add log
        addTagCreateLog({ id: tag.id, name: tag.name }, data.entityId)

        revalidatePath("/dashboard/tags")
        return tag
}

// Update an existing tag
export async function updateTag(id: string, entityId: string, data: TagUpdateData) {
        // First get the tag to access its name and related materials
        const existingTag = await prisma.tag.findUnique({
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

        if (!existingTag) {
            throw new NotFoundTagError("Tag not found")
        }

        const tag = await prisma.tag.update({
            where: { id, entityId },
            data,
        })

        // If the name has changed, generate history for all active materials using this tag
        if (data.name !== existingTag.name && existingTag.Materials.length > 0) {
            existingTag.Materials.forEach((material) => {
                // No need to await, we can generate histories in the background
                createMaterialHistory(material.id)
            })
        }

        // Add log
        addTagUpdateLog({ id: tag.id, name: tag.name }, entityId)

        revalidatePath("/configuration/tags")
        return tag
}

// Delete a tag
export async function deleteTag(id: string, entityId: string) {     // Check if the tag is used by any materials
        const materialCount = await prisma.material.count({
            where: {
                Tags: {
                    some: {
                        id,
                    },
                },
            },
        })

        if (materialCount > 0) {
            throw new DeleteTagUsedByMaterialsError("Cannot delete tag used by materials")
        }

        const tag = await prisma.tag.delete({
            where: {
                id,
                entityId,
            },
        })

        // Add log
        // No need to await, we can log in the background
        addTagDeleteLog({ id, name: tag.name }, entityId)
        
        revalidatePath("/configuration/tags")
        return tag
}
