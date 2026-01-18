import { Characteristic, CharacteristicType } from "@/prisma/generated/browser"
import { CharacteristicBoolean, CharacteristicDate, CharacteristicDateRange, CharacteristicFile, CharacteristicMulti, CharacteristicMultiText, CharacteristicString, CharacteristicValueFile, CharacteristicValueFileClient, MaterialCharacteristic, MaterialCharacteristicClient } from "@/types/characteristic.type"


export const getTypeColor = (type: CharacteristicType) => {
    const typeColors: Record<CharacteristicType, string> = {
        checkbox: "bg-cyan-100 text-cyan-800",
        select: "bg-green-100 text-green-800",
        radio: "bg-purple-100 text-purple-800",
        multiSelect: "bg-indigo-100 text-indigo-800",
        text: "bg-gray-100 text-gray-800",
        textarea: "bg-stone-100 text-gray-800",
        multiText: "bg-zinc-100 text-gray-800",
        multiTextArea: "bg-slate-100 text-gray-800",
        number: "bg-amber-100 text-amber-800",
        float: "bg-amber-100 text-amber-800",
        email: "bg-pink-100 text-pink-800",
        date: "bg-red-300 text-red-900",
        dateHour: "bg-red-100 text-red-800",
        dateRange: "bg-orange-300 text-orange-900",
        dateHourRange: "bg-orange-100 text-orange-800",
        link: "bg-blue-100 text-blue-800",
        file: "bg-teal-100 text-teal-800",
        boolean: "bg-violet-100 text-violet-800",
    }

    return typeColors[type] || "bg-gray-100 text-gray-800"
}

export function buildCharacteristicDefaultValue(characteristic: Characteristic): MaterialCharacteristicClient {
    const type = characteristic.type

    // Create base structure with characteristic data
    const base = {
        characteristicId: characteristic.id,
        Characteristic: characteristic as any,
    }

    if (
        type === "text" ||
        type === "textarea" ||
        type === "link" ||
        type === "email" ||
        type === "number" ||
        type === "float"
    ) {
        return {
            ...base,
            value: "",
            Characteristic: characteristic as CharacteristicString,
        }
    }

    if (type === "multiText" || type === "multiTextArea") {
        return {
            ...base,
            value: {
                multiText: [{ title: "", text: "" }],
            },
            Characteristic: characteristic as CharacteristicMultiText,
        }
    }

    if (type === "multiSelect" || type === "select" || type === "checkbox" || type === "radio") {
        return {
            ...base,
            value: [],
            Characteristic: characteristic as CharacteristicMulti,
        }
    }

    if (type === "boolean") {
        return {
            ...base,
            value: false,
            Characteristic: characteristic as CharacteristicBoolean,
        }
    }

    if (type === "date" || type === "dateHour") {
        return {
            ...base,
            value: { date: new Date() },
            Characteristic: characteristic as CharacteristicDate,
        }
    }

    if (type === "dateRange" || type === "dateHourRange") {
        return {
            ...base,
            value: { from: new Date(), to: new Date() },
            Characteristic: characteristic as CharacteristicDateRange,
        }
    }

    if (type === "file") {
        return {
            ...base,
            value: {
                file: [],
                fileToAdd: [],
                fileToDelete: [],
            },
            Characteristic: characteristic as CharacteristicFile,
        }
    }

    // Default case
    return {
        ...base,
        value: "",
        Characteristic: characteristic as CharacteristicString,
    }
}

export function isCharacteristicValueFile(value: MaterialCharacteristic): value is CharacteristicValueFile {
    return value.Characteristic.type === "file"
}

export function isCharacteristicValueFileClient(
    value: MaterialCharacteristicClient,
): value is CharacteristicValueFileClient {
    return value.Characteristic.type === "file"
}