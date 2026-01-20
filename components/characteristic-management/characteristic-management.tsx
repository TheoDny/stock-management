'use client'

import { Pencil, Plus, Search } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { getCharacteristicsAction } from "@/actions/characteritic.action"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Column, DataTable } from "@/components/ui/data-table"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDate } from "@/lib/utils"
import { getTypeColor } from "@/lib/utils.client"
import { CharacteristicAndCountMaterial } from "@/types/characteristic.type"
import { CharacteristicDialog } from "./characteristic-dialog"

type SortField = "name" | "type" | "materialsCount" | "updatedAt"
type SortDirection = "asc" | "desc"

export function CharacteristicManagement() {
    const t = useTranslations("Configuration.characteristics")
    const tCommon = useTranslations("Common")
    const [characteristics, setCharacteristics] = useState<CharacteristicAndCountMaterial[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCharacteristic, setEditingCharacteristic] = useState<CharacteristicAndCountMaterial | null>(null)
    const [sortField, setSortField] = useState<SortField>("name")
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
    const currentLocale = useLocale()

    // Load characteristics on mount
    useEffect(() => {
        let isMounted = true

        const loadCharacteristics = async () => {
            try {
                const characteristicsData = await getCharacteristicsAction()
                if (isMounted) {
                    setCharacteristics(characteristicsData)
                }
            } catch (error) {
                console.error(error)
                if (isMounted) {
                    toast.error(t("errors.loadFailed"))
                }
            }
        }

        loadCharacteristics()

        return () => {
            isMounted = false
        }
    }, [t])

    // Filter and sort characteristics using useMemo
    const filteredCharacteristics = useMemo(() => {
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
            } else if (sortField === "updatedAt") {
                comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
            }

            return sortDirection === "asc" ? comparison : -comparison
        })

        return filtered
    }, [characteristics, searchQuery, sortField, sortDirection])

    const handleCreateCharacteristic = () => {
        setEditingCharacteristic(null)
        setIsDialogOpen(true)
    }

    const handleEditCharacteristic = (characteristic: CharacteristicAndCountMaterial) => {
        setEditingCharacteristic(characteristic)
        setIsDialogOpen(true)
    }

    const handleCharacteristicDialogClose = async (refreshData: boolean) => {
        setIsDialogOpen(false)
        if (refreshData) {
            try {
                const characteristicsData = await getCharacteristicsAction()
                setCharacteristics(characteristicsData)
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
            cell: (characteristic) => {
                const options = characteristic.options as string[]
                if (!characteristic.options) {
                    return <span></span>
                }

                // Format options as string
                const optionsText = options.join(", ")


                // If text is longer than 50 characters, use HoverCard
                if (optionsText.length > 50) {
                    const truncatedText = optionsText.substring(0, 30) + "..."
                    return (
                        <HoverCard>
                            <HoverCardTrigger asChild>
                                <span className="cursor-pointer border p-1 rounded-md">
                                    {truncatedText}
                                </span>
                            </HoverCardTrigger>
                            <HoverCardContent className="max-w-md">
                                {options.map((option, i) => (
                                    <div key={i}>
                                        <p>{option}</p>
                                        {i < options.length - 1 && <div className="my-2 border" />}
                                    </div>
                                ))}
                            </HoverCardContent>
                        </HoverCard>
                    )
                }

                return <span>{optionsText}</span>
            },
        },
        {
            key: "units",
            header: t("columns.units"),
            cell: (characteristic) => characteristic.units || <span></span>,
        },
        {
            key: "materialsCount",
            header: t("columns.materials"),
            cell: (characteristic) => characteristic._count.Materials,
            sortable: true,
            onSort: () => handleSort("materialsCount"),
            sortDirection: sortField === "materialsCount" ? sortDirection : null,
        },
        {
            key: "updatedAt",
            header: t("columns.updatedAt"),
            cell: (characteristic) => formatDate(characteristic.updatedAt, "HH:mm - PPP", currentLocale as "en" | "fr"),
            sortable: true,
            onSort: () => handleSort("updatedAt"),
            sortDirection: sortField === "updatedAt" ? sortDirection : null,
        },
        {
            key: "actions",
            header: t("columns.actions"),
            cell: (characteristic) => (
                <div className="flex gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditCharacteristic(characteristic)}
                >
                    <Pencil/>
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
                actionOnDoubleClick={(characteristic) => handleEditCharacteristic(characteristic)}
            />

            <CharacteristicDialog
                open={isDialogOpen}
                characteristic={editingCharacteristic}
                onClose={handleCharacteristicDialogClose}
            />
        </div>
    )
}
