import { Characteristic, Prisma } from "@/prisma/generated/client"

export type CharacteristicAndCountMaterial = Prisma.CharacteristicGetPayload<{
    include: {
        _count: {
            select: { Materials: true }
        }
    }
}>

export type MaterialCharacteristic =
    | CharacteristicValueString
    | CharacteristicValueMultiText
    | CharacteristicValueMulti
    | CharacteristicValueBoolean
    | CharacteristicValueDate
    | CharacteristicValueDateRange
    | CharacteristicValueFile

export type MaterialCharacteristicClient =
    | CharacteristicValueString
    | CharacteristicValueMultiText
    | CharacteristicValueMulti
    | CharacteristicValueBoolean
    | CharacteristicValueDate
    | CharacteristicValueDateRange
    | CharacteristicValueFileClient

export type CharacteristicString = Omit<Characteristic, "type"> & {
    type: "text" | "textarea" | "link" | "email" | "number" | "float"
}

export type CharacteristicValueString = {
    characteristicId: string
    value: string
    Characteristic: CharacteristicString
}

export type CharacteristicMultiText = Omit<Characteristic, "type"> & {
    type: "multiText" | "multiTextArea"
}
export type CharacteristicValueMultiText = {
    characteristicId: string
    value: {
        multiText: {
            title: string
            text: string
        }[]
    }
    Characteristic: CharacteristicMultiText
}

export type CharacteristicMulti = Omit<Characteristic, "type"> & {
    type: "multiSelect" | "select" | "checkbox" | "radio"
}

export type CharacteristicValueMulti = {
    characteristicId: string
    value: string[]
    Characteristic: CharacteristicMulti
}

export type CharacteristicBoolean = Omit<Characteristic, "type"> & {
    type: "boolean"
}

export type CharacteristicValueBoolean = {
    characteristicId: string
    value: boolean
    Characteristic: CharacteristicBoolean
}

export type CharacteristicDate = Omit<Characteristic, "type"> & {
    type: "date" | "dateHour"
}

export type CharacteristicValueDate = {
    characteristicId: string
    value: { date: Date }
    Characteristic: CharacteristicDate
}

export type CharacteristicDateRange = Omit<Characteristic, "type"> & {
    type: "dateRange" | "dateHourRange"
}

export type CharacteristicValueDateRange = {
    characteristicId: string
    value: { from: Date; to: Date }
    Characteristic: CharacteristicDateRange
}

export type CharacteristicFile = Omit<Characteristic, "type"> & {
    type: "file"
}

export type CharacteristicValueFile = {
    characteristicId: string
    Characteristic: CharacteristicFile
    File?: { id: string; name: string; type: string }[]
}

export type CharacteristicValueFileClient = {
    characteristicId: string
    value: {
        file: {
            id: string
            name: string
            type: string
        }[]
        fileToAdd: File[]
        fileToDelete: string[]
    }
    Characteristic: CharacteristicFile
}
