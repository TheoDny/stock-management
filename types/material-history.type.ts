import { Prisma } from "@/prisma/generated/client"

export type MaterialHistoryCharacTyped = Prisma.Material_HistoryGetPayload<{}> & {
    Characteristics: CharacteristicHistory[]
    Tags: TagHistory[]
}

export type TagHistory = {
    name: string
    color: string
    fontColor: string
}

export type CharacteristicHistory =
    | CharacteristicHistoryString
    | CharacteristicHistoryNumber
    | CharacteristicHistoryBoolean
    | CharacteristicHistoryDate
    | CharacteristicHistoryDateRange
    | CharacteristicHistoryFile
    | CharacteristicHistoryMulti
    | CharacteristicHistoryMultiText

export type CharacteristicHistoryString = {
    name: string
    type: "text" | "textarea" | "link" | "email" | "number" | "float"
    value: string
}

export type CharacteristicHistoryNumber = {
    name: string
    type: "number" | "float"
    units?: string | null
    value: string
}

export type CharacteristicHistoryBoolean = {
    name: string
    type: "boolean"
    value: boolean
}

export type CharacteristicHistoryDate = {
    name: string
    type: "date" | "dateHour"
    value: { date: Date }
}

export type CharacteristicHistoryDateRange = {
    name: string
    type: "dateRange" | "dateHourRange"
    value: { from: Date; to: Date }
}

export type CharacteristicHistoryFile = {
    name: string
    type: "file"
    value: {
        file: {
            type: string
            name: string
            path: string
        }[]
    }
}

export type CharacteristicHistoryMulti = {
    name: string
    type: "multiSelect" | "select" | "checkbox" | "radio"
    value: string[]
}

export type CharacteristicHistoryMultiText = {
    name: string
    type: "multiText" | "multiTextArea"
    value: {
        multiText: {
            title: string
            text: string
        }[]
    }
}

export type ValueFieldCharacteristicHistory =
    | string[]
    | string
    | boolean
    | { date: Date }
    | { from: Date; to: Date }
    | {
          file: {
              type: string
              name: string
              path: string
          }[]
      }
    | { multiText: { title: string; text: string }[] }
