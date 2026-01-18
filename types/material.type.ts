import { Prisma } from "@/prisma/generated/client"

export type MaterialWithTag = Prisma.MaterialGetPayload<{
    include: {
        Tags: true
    }
}>

export type MaterialCharacteristicWithFile = Prisma.Material_CharacteristicGetPayload<{
    include: {
        File: true
    }
}>