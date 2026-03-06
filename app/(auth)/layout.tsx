import { AuthLayout } from "@/components/auth/AuthLayout"
import { Toaster } from "@/components/ui/sonner"
import { NextIntlClientProvider } from "next-intl"
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
                    href="/favicon.ico"
                />
            </head>
            <body className="dark">
                <Suspense fallback={<div className="min-h-screen" />}>
                    <NextIntlClientProvider>
                        <Toaster />
                        <AuthLayout>{children}</AuthLayout>
                    </NextIntlClientProvider>
                </Suspense>
            </body>
        </html>
    )
}
