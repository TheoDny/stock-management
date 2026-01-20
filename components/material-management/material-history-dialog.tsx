"use client"


import { getMaterialHistoryLastAction } from "@/actions/material-history.action"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { sleep } from "@/lib/utils"
import { MaterialHistoryCharacTyped } from "@/types/material-history.type"
import { useEffect, useState } from "react"
import MaterialHistoryDisplay from "./material-history/material-history-view"

interface MaterialHistoryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    materialId: string | null
    materialName: string | null
}

export function MaterialHistoryDialog({
    open,
    onOpenChange,
    materialId,
    materialName,
}: MaterialHistoryDialogProps) {
    const handleOpenChange = (isOpen: boolean) => {
        onOpenChange(isOpen)
        if (!isOpen) {
            //avoid flickering when closing the dialog
            sleep(150).then(() => {
                setLastHistory(null)
                setLoading(true)
            })
        }
    }
    const [lastHistory, setLastHistory] = useState<MaterialHistoryCharacTyped | null>(null)
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        if (open && materialId) {
            getMaterialHistoryLastAction({ materialId: materialId })
                .then((data) => {
                    setLastHistory(data?.data ?? null)
                    setLoading(false)
                })
                .catch((error) => {
                    console.error(error)
                }).finally(() => {
                    setLoading(false)
                })
        }
    }, [open, materialId])

    return (
        <Dialog
            open={open}
            onOpenChange={handleOpenChange}
        >
            <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle> {materialName} </DialogTitle>
                </DialogHeader>
                {loading ? (
                    <>
                        <Skeleton className="h-[400px] w-full" />
                    </>
                ) : (
                    <MaterialHistoryDisplay history={lastHistory ? [lastHistory] : []} />
                )}
            </DialogContent>
        </Dialog>
    )
}
