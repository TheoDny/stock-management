import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { MaterialHistoryView } from "@/components/material-management/material-history/material-history-view"
import { Skeleton } from "@/components/ui/skeleton"
import { getTranslations } from "next-intl/server"
import { getMaterialById } from "@/services/material.service"

interface MaterialHistoryPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function MaterialHistoryPage({ params }: MaterialHistoryPageProps) {
    // Await params before accessing its properties
    const resolvedParams = await params
    const materialId = resolvedParams.id

    const [material, t, tCommon] = await Promise.all([
        getMaterialById(materialId),
        getTranslations("Materials.history"),
        getTranslations("Common"),
    ])

    if (!material) {
        notFound()
    }

    return (
        <div className="lg:p-2">
            <div className="mb-6">
                <Link href="/materials">
                    <Button
                        variant="ghost"
                        className="mb-4"
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        {tCommon("back")}
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                <p className="text-muted-foreground">{material.name}</p>
            </div>
            <Suspense fallback={<MaterialHistorySkeleton />}>
                <MaterialHistoryView
                    materialId={materialId}
                    materialName={material.name}
                />
            </Suspense>
        </div>
    )
}

function MaterialHistorySkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[500px] w-full" />
        </div>
    )
}
