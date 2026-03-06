import { AuthenticatedAppShell } from "@/app/(app)/authenticated-app-shell"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ConfirmDialogProvider } from "@/provider/ConfirmationProvider"
import "dotenv/config"
import { NextIntlClientProvider } from "next-intl"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { Suspense, type ReactNode } from "react"
import "../globals.css"

interface RootLayoutProps {
    children: ReactNode
}

const appName = process.env.NEXT_PUBLIC_NAME_APP ?? "App name"

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
        >
            <head>
                <title>{appName}</title>
                <link
                    rel="icon"
                    href="/favicon.svg"
                />
            </head>
            <body>
                <NextThemesProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <TooltipProvider delayDuration={100}>
                        <ConfirmDialogProvider>
                            <Toaster />
                            <Suspense fallback={<div className="p-1.5" />}>
                                <NextIntlClientProvider>
                                    <AuthenticatedAppShell>{children}</AuthenticatedAppShell>
                                </NextIntlClientProvider>
                            </Suspense>
                        </ConfirmDialogProvider>
                    </TooltipProvider>
                </NextThemesProvider>
            </body>
        </html>
    )
}
