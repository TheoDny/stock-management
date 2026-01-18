import { Suspense } from "react"
import { MaterialManagement } from "@/components/material-management/material-management"
import { Skeleton } from "@/components/ui/skeleton"
import { getTranslations } from "next-intl/server"

export default async function MaterialsPage() {
    const t = await getTranslations("Materials")

    return (
        <div className="p-2">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                <p className="text-muted-foreground">{t("description")}</p>
            </div>
            <Suspense fallback={<MaterialManagementSkeleton />}>
                <MaterialManagement />
            </Suspense>
        </div>
    )
}

function MaterialManagementSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex justify-between">
                <Skeleton className="h-10 w-[250px]" />
                <Skeleton className="h-10 w-[100px]" />
            </div>
            <Skeleton className="h-[500px] w-full" />
        </div>
    )
}
