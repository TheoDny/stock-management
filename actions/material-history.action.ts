"use server"

import { checkAuth } from "@/lib/auth-guard"
import { actionClient } from "@/lib/safe-action"
import { getMaterialHistory, getMaterialHistoryLast } from "@/services/material-history.service"
import { MaterialHistoryCharacTyped } from "@/types/material-history.type"
import { z } from "zod"

// Schéma pour la validation des entrées
const getMaterialHistorySchema = z.object({
    materialId: z.string(),
    dateFrom: z.date(),
    dateTo: z.date(),
})

const getMaterialLastHistorySchema = z.object({
    materialId: z.string(),
})

export const getMaterialHistoryAction = actionClient
    .inputSchema(getMaterialHistorySchema)
    .action(async ({ parsedInput }): Promise<MaterialHistoryCharacTyped[]> => {
        try {
            // Basic auth check
            await checkAuth()

            return await getMaterialHistory(parsedInput.materialId, parsedInput.dateFrom, parsedInput.dateTo)
        } catch (error) {
            console.error("Failed actionto fetch material history:", error)
            throw new Error("Failed action to fetch material history")
        }
    })

export const getMaterialHistoryLastAction = actionClient
    .inputSchema(getMaterialLastHistorySchema)
    .action(async ({ parsedInput }): Promise<MaterialHistoryCharacTyped> => {
        try {
            // Basic auth check
            await checkAuth({ requiredPermission: "material_read" })

            return await getMaterialHistoryLast(parsedInput.materialId)
        } catch (error) {
            console.error("Failed action to fetch material history last:", error)
            throw new Error("Failed action to fetch material history last")
        }
    })
