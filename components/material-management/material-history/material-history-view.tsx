"use client"

import { getMaterialHistoryAction } from "@/actions/material-history.action"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePickerRange } from "@/components/ui/date-picker-range"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CharacteristicHistory, MaterialHistoryCharacTyped } from "@/types/material-history.type"
import { addMonths, endOfDay, startOfDay } from "date-fns"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useTranslations } from "next-intl"
import React, { useEffect, useState } from "react"
import { DateRange } from "react-day-picker"
import { toast } from "sonner"
import { Skeleton } from "../../ui/skeleton"
import { CharacteristicDisplay } from "./characteristic-display"

// Define types for parsed JSON fields
type Tag = {
    id: string
    name: string
    color: string
    fontColor?: string
}

interface MaterialHistoryViewProps {
    materialId: string
    materialName: string
}

// Helper function to safely convert JsonValue to string
const safeJsonToString = (json: any): string => {
    if (typeof json === "string") return json
    if (json === null) return ""
    return JSON.stringify(json)
}

// Helper function to parse Tags JSON
const parseTags = (tagsJson: any): Tag[] => {
    if (!tagsJson) return []
    try {
        const jsonString = safeJsonToString(tagsJson)
        return jsonString ? JSON.parse(jsonString) : []
    } catch (error) {
        console.error("Error parsing Tags JSON:", error)
        return []
    }
}

// Helper function to parse Characteristics JSON
const parseCharacteristics = (characteristicsJson: any): CharacteristicHistory[] => {
    if (!characteristicsJson) return []
    try {
        const jsonString = safeJsonToString(characteristicsJson)
        return jsonString ? JSON.parse(jsonString) : []
    } catch (error) {
        console.error("Error parsing Characteristics JSON:", error)
        return []
    }
}

export function MaterialHistoryView({ materialId, materialName }: MaterialHistoryViewProps) {
    const historyT = useTranslations("MaterialHistory")
    const common = useTranslations("Common")
    const materialsT = useTranslations("Materials")

    const [history, setHistory] = useState<MaterialHistoryCharacTyped[]>([])
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState<DateRange>({
        from: addMonths(new Date(), -1),
        to: new Date(),
    })
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const itemsPerPage = 10

    useEffect(() => {
        loadHistory()
    }, [materialId])

    const handleSetDateRange = (range: DateRange | undefined) => {
        if (range) setDateRange(range)
    }

    const loadHistory = async () => {
        try {
            setLoading(true)
            const result = await getMaterialHistoryAction({
                materialId,
                dateFrom: dateRange.from ? startOfDay(dateRange.from) : addMonths(startOfDay(new Date()), -1),
                dateTo: dateRange.to ? endOfDay(dateRange.to) : endOfDay(new Date()),
            })

            if (result?.serverError) {
                console.error(result?.serverError)
                toast.error(historyT("serverError"))
            } else if (result?.validationErrors) {
                console.error(result?.validationErrors)
                toast.error(historyT("validationError"))
            } else if (!result?.data) {
                console.error("No data returned")
                toast.error(historyT("noData"))
            } else {
                setHistory(result.data)
                setTotalPages(Math.ceil(result.data.length / itemsPerPage))
                setCurrentPage(1) // Reset to first page when new data is loaded
            }
        } catch (error) {
            console.error(error)
            toast.error(historyT("failedToLoad"))
        } finally {
            setLoading(false)
        }
    }

    // Get current page items
    const getCurrentPageItems = () => {
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        return history.slice(startIndex, endIndex)
    }

    const goToNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage((current) => current + 1)
        }
    }

    const goToPreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage((current) => current - 1)
        }
    }

    const goToFirstPage = () => {
        setCurrentPage(1)
    }

    const goToLastPage = () => {
        setCurrentPage(totalPages)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {materialsT("history.title")} - {materialName}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4 mb-4 sm:flex-row items-end">
                    <DatePickerRange
                        date={dateRange}
                        setDate={handleSetDateRange}
                        textHolder={common("selectDateRange")}
                        className="w-full sm:w-auto"
                        hoursText={{
                            label: common("language") === "fr" ? "Heures" : "Hours",
                            from: common("language") === "fr" ? "De" : "From",
                            to: common("language") === "fr" ? "À" : "To",
                        }}
                    />
                    <Button
                        onClick={loadHistory}
                        disabled={loading}
                    >
                        {loading ? common("loading") : common("filter")}
                    </Button>
                </div>

                {loading ? (
                    <>
                        <Skeleton className="h-[570px] w-full mb-1" />
                        <Skeleton className="h-[35px] w-full" />
                    </>
                ) : (
                    <>
                        <MaterialHistoryDisplay history={getCurrentPageItems()} />

                        {/* Pagination controls */}
                        {history.length > 0 && (
                            <div className="flex justify-between items-center mt-4">
                                <div className="text-sm text-muted-foreground">
                                    {(currentPage - 1) * itemsPerPage + 1}
                                    {" - "}
                                    {Math.min(currentPage * itemsPerPage, history.length)}{" "}
                                    {" -- (" + history.length + ")"}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={goToFirstPage}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronsLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={goToPreviousPage}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={goToNextPage}
                                        disabled={currentPage >= totalPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={goToLastPage}
                                        disabled={currentPage >= totalPages}
                                    >
                                        <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}

// Component that just displays the history without fetching it
export default function MaterialHistoryDisplay({ history }: { history: MaterialHistoryCharacTyped[] }) {
    const historyT = useTranslations("MaterialHistory")
    const materialsT = useTranslations("Materials")

    if (!history || history.length === 0) {
        return <div>{materialsT("history.noHistory")}</div>
    }

    return (
        <div className="space-y-4">
            <div className="border rounded-md">
                {history.map((record, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && <Separator />}
                        <Accordion
                            type="single"
                            collapsible
                            className="w-full"
                        >
                            <AccordionItem value={`item-${index}`}>
                                <AccordionTrigger className="px-4">
                                    <div className="flex justify-between w-full">
                                        <span>{new Date(record.createdAt).toLocaleString()}</span>
                                        <span className="text-sm text-gray-500">
                                            {historyT("recordFor")} {record.name}
                                        </span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4">
                                    {/* Tabs for mobile and medium screens */}
                                    <div className="2xl:hidden">
                                        <Tabs defaultValue="details">
                                            <TabsList className="w-full grid grid-cols-2 gap-2 mt-2">
                                                <TabsTrigger value="details">
                                                    {historyT("detailsAndTags")}
                                                </TabsTrigger>
                                                <TabsTrigger value="characteristics">
                                                    {historyT("characteristics")}
                                                </TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="details">
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    <div className="text-sm font-medium">{historyT("name")}:</div>
                                                    <div className="text-sm">{record.name || historyT("na")}</div>

                                                    <div className="text-sm font-medium">
                                                        {historyT("description")}:
                                                    </div>
                                                    <div className="text-sm">
                                                        {record.description || historyT("na")}
                                                    </div>

                                                    <div className="text-sm font-medium">
                                                        {historyT("createdAt")}:
                                                    </div>
                                                    <div className="text-sm">
                                                        {new Date(record.createdAt).toLocaleString()}
                                                    </div>
                                                </div>

                                                <div className="mt-4">
                                                    <div className="text-sm font-medium mb-2">
                                                        {historyT("tags")}:
                                                    </div>
                                                    {parseTags(record.Tags).length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {parseTags(record.Tags).map((tag, idx) => (
                                                                <Badge
                                                                    style={{
                                                                        backgroundColor: tag.color,
                                                                        color: tag.fontColor,
                                                                    }}
                                                                    key={idx}
                                                                >
                                                                    {tag.name}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-500">
                                                            {historyT("noTags")}
                                                        </div>
                                                    )}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="characteristics">
                                                {parseCharacteristics(record.Characteristics).length > 0 ? (
                                                    <div className="space-y-3 mt-2">
                                                        {parseCharacteristics(record.Characteristics).map(
                                                            (char, idx) => (
                                                                <div key={idx}>
                                                                    <CharacteristicDisplay
                                                                        characteristic={char}
                                                                        showLabel={true}
                                                                    />
                                                                    {idx <
                                                                        parseCharacteristics(
                                                                            record.Characteristics,
                                                                        ).length -
                                                                            1 && <Separator className="my-3" />}
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="mt-2 text-sm text-gray-500">
                                                        {historyT("noCharacteristics")}
                                                    </div>
                                                )}
                                            </TabsContent>
                                        </Tabs>
                                    </div>

                                    {/* Side by side for large screens */}
                                    <div className="hidden 2xl:grid 2xl:grid-cols-2 2xl:gap-6 2xl:mt-2">
                                        {/* Left column: Details and Tags */}
                                        <div>
                                            <h3 className="text-sm font-medium mb-3">
                                                {historyT("detailsAndTags")}
                                            </h3>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="text-sm font-medium">{historyT("name")}:</div>
                                                <div className="text-sm">{record.name || historyT("na")}</div>

                                                <div className="text-sm font-medium">
                                                    {historyT("description")}:
                                                </div>
                                                <div className="text-sm">
                                                    {record.description || historyT("na")}
                                                </div>

                                                <div className="text-sm font-medium">{historyT("createdAt")}:</div>
                                                <div className="text-sm">
                                                    {new Date(record.createdAt).toLocaleString()}
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <div className="text-sm font-medium mb-2">{historyT("tags")}:</div>
                                                {parseTags(record.Tags).length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {parseTags(record.Tags).map((tag, idx) => (
                                                            <Badge
                                                                style={{
                                                                    backgroundColor: tag.color,
                                                                    color: tag.fontColor,
                                                                }}
                                                                key={idx}
                                                            >
                                                                {tag.name}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-gray-500">
                                                        {historyT("noTags")}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right column: Characteristics */}
                                        <div>
                                            <h3 className="text-sm font-medium mb-3">
                                                {historyT("characteristics")}
                                            </h3>
                                            {parseCharacteristics(record.Characteristics).length > 0 ? (
                                                <div className="space-y-3">
                                                    {parseCharacteristics(record.Characteristics).map(
                                                        (char, idx) => (
                                                            <div key={idx}>
                                                                <CharacteristicDisplay
                                                                    characteristic={char}
                                                                    showLabel={true}
                                                                />
                                                                {idx <
                                                                    parseCharacteristics(record.Characteristics)
                                                                        .length -
                                                                        1 && <Separator className="my-3" />}
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-500">
                                                    {historyT("noCharacteristics")}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </React.Fragment>
                ))}
            </div>
        </div>
    )
}
