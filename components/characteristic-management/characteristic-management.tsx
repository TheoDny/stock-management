'use client'

import { Pencil, Plus, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { getCharacteristicsAction } from "@/actions/characteritic.action"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Column, DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { getTypeColor } from "@/lib/utils.client"
import { CharacteristicAndCountMaterial } from "@/types/characteristic.type"
import { CharacteristicDialog } from "./characteristic-dialog"

type SortField = "name" | "type" | "materialsCount"
type SortDirection = "asc" | "desc"

export function CharacteristicManagement() {
    const t = useTranslations("Configuration.characteristics")
    const [characteristics, setCharacteristics] = useState<CharacteristicAndCountMaterial[]>([])
    const [filteredCharacteristics, setFilteredCharacteristics] = useState<CharacteristicAndCountMaterial[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCharacteristic, setEditingCharacteristic] = useState<CharacteristicAndCountMaterial | null>(null)
    const [sortField, setSortField] = useState<SortField>("name")
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

    const loadCharacteristics = async () => {
        try {
            const characteristicsData = await getCharacteristicsAction()
            setCharacteristics(characteristicsData)
        } catch (error) {
            console.error(error)
            toast.error(t("errors.loadFailed"))
        }
    }

    useEffect(() => {
        loadCharacteristics()
    }, [])

    useEffect(() => {
        filterCharacteristics()
    }, [characteristics, searchQuery, sortField, sortDirection])


    const filterCharacteristics = () => {
        let filtered = [...characteristics]

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(
                (characteristic) =>
                    characteristic.name.toLowerCase().includes(query) ||
                    characteristic.description.toLowerCase().includes(query) ||
                    characteristic.type.toLowerCase().includes(query),
            )
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0

            if (sortField === "name") {
                comparison = a.name.localeCompare(b.name)
            } else if (sortField === "type") {
                comparison = a.type.localeCompare(b.type)
            } else if (sortField === "materialsCount") {
                comparison = a._count.Materials - b._count.Materials
            }

            return sortDirection === "asc" ? comparison : -comparison
        })

        setFilteredCharacteristics(filtered)
    }

    const handleCreateCharacteristic = () => {
        setEditingCharacteristic(null)
        setIsDialogOpen(true)
    }

    const handleEditCharacteristic = (characteristic: CharacteristicAndCountMaterial) => {
        setEditingCharacteristic(characteristic)
        setIsDialogOpen(true)
    }

    const handleCharacteristicDialogClose = (refreshData: boolean) => {
        setIsDialogOpen(false)
        if (refreshData) {
            loadCharacteristics()
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
    const columns: Column<CharacteristicAndCountMaterial>[] = [
        {
            key: "name",
            header: t("columns.name"),
            cell: (characteristic) => <div className="font-medium">{characteristic.name}</div>,
        },
        {
            key: "description",
            header: t("columns.description"),
            cell: (characteristic) => <div className="max-w-[200px] truncate">{characteristic.description}</div>,
        },
        {
            key: "type",
            header: t("columns.type"),
            cell: (characteristic) => (
                <Badge className={getTypeColor(characteristic.type)}>{characteristic.type}</Badge>
            ),
        },
        {
            key: "options",
            header: t("columns.options"),
            cell: () => null, // TODO handle option with different type
        },
        {
            key: "units",
            header: t("columns.units"),
            cell: (characteristic) => characteristic.units || <span className="text-muted-foreground">{tCommon("none")}</span>,
        },
        {
            key: "materialsCount",
            header: t("columns.materials"),
            cell: (characteristic) => characteristic._count.Materials,
        },
        {
            key: "actions",
            header: t("columns.actions"),
            cell: (characteristic) => (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditCharacteristic(characteristic)}
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
                <Button onClick={handleCreateCharacteristic}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("newCharacteristic")}
                </Button>
            </div>

            <DataTable
                data={filteredCharacteristics}
                columns={columns}
                keyExtractor={(characteristic) => characteristic.id}
                pageSizeOptions={[15, 50, 100]}
                defaultPageSize={15}
                noDataMessage={t("noData")}
            />

            <CharacteristicDialog
                open={isDialogOpen}
                characteristic={editingCharacteristic}
                onClose={handleCharacteristicDialogClose}
            />
        </div>
    )
}
