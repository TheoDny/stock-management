import { Prisma } from "@/prisma/generated/client"

export type TagAndCountMaterial = Prisma.TagGetPayload<{
    include: {
        _count: {
            select: { Materials: true }
        }
    }
}>
