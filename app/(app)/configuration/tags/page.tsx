import { TagManagement } from "@/components/tag-management/tag-management"
import { Skeleton } from "@/components/ui/skeleton"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

export default async function TagsPage() {
    const t = await getTranslations("Configuration.tags")

    return (
        <div className="p-2">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                <p className="text-muted-foreground">{t("description")}</p>
            </div>
            <Suspense fallback={<TagManagementSkeleton />}>
                <TagManagement />
            </Suspense>
        </div>
    )
}

function TagManagementSkeleton() {
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
