"use client"

import { Eye, History, Pencil, Plus, Search } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { getMaterialsAction } from "@/actions/material.actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Column, DataTable } from "@/components/ui/data-table"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDate } from "@/lib/utils"
import { MaterialWithTag } from "@/types/material.type"
import Link from "next/link"
import { MaterialDialog } from "./material-dialog"
import { MaterialHistoryDialog } from "./material-history-dialog"

type SortField = "name" | "updatedAt"
type SortDirection = "asc" | "desc"

export function MaterialManagement() {
    const [materials, setMaterials] = useState<MaterialWithTag[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingMaterial, setEditingMaterial] = useState<MaterialWithTag | null>(null)
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)
    const [selectedMaterialForLastHistory, setSelectedMaterialForLastHistory] = useState<{ id: string, name: string } | null>(null)
    const [sortField, setSortField] = useState<SortField>("updatedAt")
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
    const currentLocale = useLocale()
    const t = useTranslations("Materials")
    const tCommon = useTranslations("Common")

    // Load materials on mount
    useEffect(() => {
        let isMounted = true

        const loadMaterials = async () => {
            try {
                const materialsData = await getMaterialsAction()
                if (isMounted) {
                    setMaterials(materialsData)
                }
            } catch (error) {
                console.error(error)
                if (isMounted) {
                    toast.error(t("errors.loadFailed"))
                }
            }
        }

        loadMaterials()

        return () => {
            isMounted = false
        }
    }, [t])

    // Filter and sort materials using useMemo
    const filteredMaterials = useMemo(() => {
        let filtered = [...materials]

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(
                (material) =>
                    material.name.toLowerCase().includes(query) ||
                    material.description.toLowerCase().includes(query) ||
                    material.Tags.some((tag) => tag.name.toLowerCase().includes(query)),
            )
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0

            if (sortField === "name") {
                comparison = a.name.localeCompare(b.name)
            } else if (sortField === "updatedAt") {
                comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
            }

            return sortDirection === "asc" ? comparison : -comparison
        })

        return filtered
    }, [materials, searchQuery, sortField, sortDirection])

    const handleCreateMaterial = () => {
        setEditingMaterial(null)
        setIsDialogOpen(true)
    }

    const handleEditMaterial = (material: MaterialWithTag) => {
        setEditingMaterial(material)
        setIsDialogOpen(true)
    }

    const handleViewLastHistory = async (material: { id: string, name: string }) => {
        setSelectedMaterialForLastHistory(material)
        setIsHistoryDialogOpen(true)
    }

    const handleMaterialDialogClose = async (refreshData: boolean) => {
        setIsDialogOpen(false)

        if (refreshData) {
            try {
                const materialsData = await getMaterialsAction()
                setMaterials(materialsData)
            } catch (error) {
                console.error(error)
                toast.error(t("errors.loadFailed"))
            }
        }
    }

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc")
        } else {
            setSortField(field)
            setSortDirection("asc")
        }
    }

    // Définition des colonnes pour DataTable
    const columns: Column<MaterialWithTag>[] = [
        {
            key: "name",
            header: t("columns.name"),
            cell: (material) => <div className="font-medium">{material.name}</div>,
        },
        {
            key: "description",
            header: t("columns.description"),
            cell: (material) => {
                const description = material.description || ""
                // If description is longer than 100 characters, use HoverCard
                if (description.length > 100) {
                    return (
                        <HoverCard>
                            <HoverCardTrigger asChild>
                                <span className="cursor-pointer border p-1 rounded-md truncate block max-w-[700px]">
                                    {description}
                                </span>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-lg bg-muted/50">
                                <div className="text-sm whitespace-pre-wrap wrap-break-word">
                                    {description}
                                </div>
                            </HoverCardContent>
                        </HoverCard>
                    )
                }

                return <div className="truncate max-w-[700px]">{description}</div>
            },
        },
        {
            key: "tags",
            header: t("columns.tags"),
            cell: (material) => (
                <div className="flex flex-wrap gap-1">
                    {material.Tags.length > 0 ? (
                        material.Tags.map((tag) => (
                            <Badge
                                key={tag.id}
                                style={{
                                    backgroundColor: tag.color,
                                    color: tag.fontColor,
                                }}
                            >
                                {tag.name}
                            </Badge>
                        ))
                    ) : (
                        <span className="text-muted-foreground">{tCommon("none")}</span>
                    )}
                </div>
            ),
        },
        {
            key: "updatedAt",
            header: t("columns.updatedAt"),
            cell: (material) => formatDate(material.updatedAt, "HH:mm - PPP", currentLocale as "en" | "fr"),
            sortable: true,
            onSort: () => handleSort("updatedAt"),
            sortDirection: sortField === "updatedAt" ? sortDirection : null,
        },
        {
            key: "actions",
            header: t("columns.actions"),
            cell: (material) => (
                <div className="flex gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                            >
                                <Link href={`/materials/history/${material.id}`}>
                                    <History />
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t("history.title")}</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditMaterial(material)}>
                                <Pencil />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t("dialog.edit")}</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewLastHistory({ id: material.id, name: material.name })}
                            >
                                <Eye />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t("visualize")}</p>
                        </TooltipContent>
                    </Tooltip>
                </div> 
            ),
        },
    ]

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <div className="relative w-[300px]">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("search")}
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button onClick={handleCreateMaterial}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("newMaterial")}
                </Button>
            </div>

            <DataTable
                data={filteredMaterials}
                columns={columns}
                keyExtractor={(material) => material.id}
                pageSizeOptions={[15, 50, 100]}
                defaultPageSize={15}
                noDataMessage={t("noData")}
                actionOnDoubleClick={(material) => handleViewLastHistory({ id: material.id, name: material.name })}
            />

            <MaterialDialog
                open={isDialogOpen}
                material={editingMaterial}
                onClose={handleMaterialDialogClose}
            />

            <MaterialHistoryDialog
                open={isHistoryDialogOpen}
                materialName={selectedMaterialForLastHistory?.name ?? null}
                onOpenChange={(open) => {
                    setIsHistoryDialogOpen(open)
                    if (!open) {
                        setSelectedMaterialForLastHistory(null)
                    }
                }}
                materialId={selectedMaterialForLastHistory?.id ?? null}
            />
        </div>
    )
}
