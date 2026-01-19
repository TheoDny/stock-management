"use client"

import { History, Pencil, Plus, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { getMaterialsAction } from "@/actions/material.actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Column, DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDate } from "@/lib/utils"
import { MaterialWithTag } from "@/types/material.type"
import Link from "next/link"
import { MaterialDialog } from "./material-dialog"

type SortField = "name" | "updatedAt"
type SortDirection = "asc" | "desc"

export function MaterialManagement() {
    const router = useRouter()
    const [materials, setMaterials] = useState<MaterialWithTag[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingMaterial, setEditingMaterial] = useState<MaterialWithTag | null>(null)
    const [sortField, setSortField] = useState<SortField>("updatedAt")
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
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
                    material.description.toLowerCase().includes(query),
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

    const handleViewHistory = (materialId: string) => {
        router.push(`/materials/history/${materialId}`)
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
            cell: (material) => (
                <div>
                    <div className="font-medium">{material.name}</div>
                    <div className="text-sm text-muted-foreground truncate max-w-[250px]">
                        {material.description}
                    </div>
                </div>
            ),
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
            cell: (material) => formatDate(material.updatedAt),
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
                </div> 
            ),
        },
    ]

    return (
        <div className="space-y-4 ">
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
                actionOnDoubleClick={(material) => handleEditMaterial(material)}
            />

            <MaterialDialog
                open={isDialogOpen}
                material={editingMaterial}
                onClose={handleMaterialDialogClose}
            />
        </div>
    )
}
