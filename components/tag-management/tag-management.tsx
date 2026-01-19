"use client"

import { Pencil, Plus, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { getTagsAction } from "@/actions/tag.action"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Column, DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { TagAndCountMaterial } from "@/types/tag.type"
import { TagDialog } from "./tag-dialog"

type SortField = "name" | "colorText" | "materialsCount"
type SortDirection = "asc" | "desc"

export function TagManagement() {
    const t = useTranslations("Configuration.tags")
    const [tags, setTags] = useState<TagAndCountMaterial[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingTag, setEditingTag] = useState<TagAndCountMaterial | null>(null)
    const [sortField, setSortField] = useState<SortField>("name")
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

    // Load tags on mount
    useEffect(() => {
        let isMounted = true

        const loadTags = async () => {
            try {
                const tagsData = await getTagsAction()
                if (isMounted) {
                    setTags(tagsData)
                }
            } catch (error) {
                console.error(error)
                if (isMounted) {
                    toast.error(t("errors.loadFailed"))
                }
            }
        }

        loadTags()

        return () => {
            isMounted = false
        }
    }, [t])

    // Filter and sort tags using useMemo
    const filteredTags = useMemo(() => {
        let filtered = [...tags]

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(
                (tag) => tag.name.toLowerCase().includes(query) || tag.fontColor.toLowerCase().includes(query),
            )
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0

            if (sortField === "name") {
                comparison = a.name.localeCompare(b.name)
            } else if (sortField === "colorText") {
                comparison = a.fontColor.localeCompare(b.fontColor)
            } else if (sortField === "materialsCount") {
                comparison = a._count.Materials - b._count.Materials
            }

            return sortDirection === "asc" ? comparison : -comparison
        })

        return filtered
    }, [tags, searchQuery, sortField, sortDirection])

    const handleCreateTag = () => {
        setEditingTag(null)
        setIsDialogOpen(true)
    }

    const handleEditTag = (tag: TagAndCountMaterial) => {
        setEditingTag(tag)
        setIsDialogOpen(true)
    }

    const handleTagDialogClose = async (refreshData: boolean) => {
        setIsDialogOpen(false)

        if (refreshData) {
            try {
                const tagsData = await getTagsAction()
                setTags(tagsData)
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
    const columns: Column<TagAndCountMaterial>[] = [
        {
            key: "name",
            header: t("columns.name"),
            cell: (tag) => (
                <Badge
                    style={{
                        backgroundColor: tag.color,
                        color: tag.fontColor,
                    }}
                >
                    {tag.name}
                </Badge>
            ),
        },
        {
            key: "fontColor",
            header: t("columns.colorText"),
            cell: (tag) => tag.fontColor,
        },
        {
            key: "color",
            header: t("columns.color"),
            cell: (tag) => (
                <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: tag.color }}
                />
            ),
        },
        {
            key: "materialsCount",
            header: t("columns.materials"),
            cell: (tag) => tag._count.Materials,
        },
        {
            key: "actions",
            header: t("columns.actions"),
            cell: (tag) => (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditTag(tag)}
                >
                    <Pencil className="h-4 w-4" />
                </Button>
            ),
        },
    ]

    return (
        <div className="space-y-4">
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
                <Button onClick={handleCreateTag}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("newTag")}
                </Button>
            </div>

            <DataTable
                data={filteredTags}
                columns={columns}
                keyExtractor={(tag) => tag.id}
                pageSizeOptions={[15, 50, 100]}
                defaultPageSize={15}
                noDataMessage={t("noData")}
            />

            <TagDialog
                open={isDialogOpen}
                tag={editingTag}
                onClose={handleTagDialogClose}
            />
        </div>
    )
}
