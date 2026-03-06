import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { PermissionModel as Permission } from "@/prisma/generated/models/Permission"
import { NavigationGroupType, NavigationType } from "@/types/navigation.type"
import { Boxes, IdCard, ListTree, Logs, SquareChartGantt, Tags, Users } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"
import { headers } from "next/headers"
import { unauthorized } from "next/navigation"
import { ReactNode } from "react"

interface AuthenticatedAppShellProps {
    children: ReactNode
}

const appName = process.env.NEXT_PUBLIC_NAME_APP ?? "App name"

export async function AuthenticatedAppShell({ children }: AuthenticatedAppShellProps) {
    const session = await auth.api.getSession({
        headers: await headers(),
    })

    if (!session) {
        unauthorized()
    }

    const locale = await getLocale()

    const tSidebar = await getTranslations("Sidebar")

    const buildNavigation = (sessionData: any): NavigationType => {
        const navigation: NavigationType = {
            user: {
                name: sessionData.user.name,
                avatar: sessionData.user.image ?? "",
                Entities: sessionData.user.Entities as { id: string; name: string }[],
                EntitySelected: sessionData.user.EntitySelected as { id: string; name: string },
            },
            header: {
                name: appName,
                logo: <Boxes />,
            },
            groups: [],
        }
        const permissions = new Set(
            sessionData.user.Permissions.map((permission: Permission) => permission.code),
        )

        if (permissions.has("user_read") || permissions.has("role_read") || permissions.has("log_read")) {
            const adminGroup: NavigationGroupType = {
                title: tSidebar("administration"),
                items: [],
            }
            if (permissions.has("role_read")) {
                adminGroup.items.push({
                    title: tSidebar("roles"),
                    url: "/administration/roles",
                    icon: <IdCard />,
                })
            }
            if (permissions.has("user_read")) {
                adminGroup.items.push({
                    title: tSidebar("users"),
                    url: "/administration/users",
                    icon: <Users />,
                })
            }
            if (permissions.has("log_read")) {
                adminGroup.items.push({
                    title: tSidebar("logs"),
                    url: "/administration/log",
                    icon: <Logs />,
                })
            }
            navigation.groups.push(adminGroup)
        }

        if (permissions.has("characteristic_read") || permissions.has("tag_read")) {
            const configGroup: NavigationGroupType = {
                title: tSidebar("configuration"),
                items: [],
            }
            if (permissions.has("characteristic_read")) {
                configGroup.items.push({
                    title: tSidebar("characteristics"),
                    url: "/configuration/characteristics",
                    icon: <ListTree />,
                })
            }
            if (permissions.has("tag_read")) {
                configGroup.items.push({
                    title: tSidebar("tags"),
                    url: "/configuration/tags",
                    icon: <Tags />,
                })
            }
            navigation.groups.push(configGroup)
        }

        if (permissions.has("material_read")) {
            const materialGroup: NavigationGroupType = {
                title: tSidebar("materials"),
                items: [],
            }
            materialGroup.items.push({
                title: tSidebar("materials"),
                url: "/materials",
                icon: <SquareChartGantt />,
            })
            navigation.groups.push(materialGroup)
        }

        return navigation
    }

    const navigation = buildNavigation(session)

    return (
        <SidebarProvider>
            <AppSidebar data={navigation} />
            <SidebarInset className={"p-1.5"}>{children}</SidebarInset>
        </SidebarProvider>
    )
}
