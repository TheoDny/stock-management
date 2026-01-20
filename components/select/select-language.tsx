"use client"

import { Button, buttonVariants } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { VariantProps } from "class-variance-authority"
import { Globe } from "lucide-react"
import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface LanguageSelectorProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean
    showText?: boolean
    languages?: Array<{ code: string; name: string }>
}

// Default supported languages
const defaultLanguages = [
    { code: "en", name: "English" },
    { code: "fr", name: "Français" },
]

export function LanguageSelector({
    showText = true,
    languages = defaultLanguages,
    ...props
}: LanguageSelectorProps) {
    const currentLocale = useLocale()
    
    const router = useRouter()
    const [localeToSet, setLocaleToSet] = useState<string | null>(null)

    // Get current language display name
    const currentLanguage = languages.find((lang) => lang.code === currentLocale)?.name || currentLocale

    // Set cookie and navigate when locale changes
    useEffect(() => {
        if (localeToSet) {
            // Set the cookie
            if (typeof document !== "undefined") {
                document.cookie = `NEXT_LOCALE=${localeToSet}; path=/`
            }
            // Reload the page to apply the new language
            router.push(window.location.pathname)
        }
    }, [localeToSet, router])

    // Change language handler
    const changeLanguage = (locale: string) => {
        setLocaleToSet(locale)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="flex gap-2 items-center"
                    {...props}
                >
                    <Globe className="h-4 w-4" />
                    {showText && <span className="">{currentLanguage}</span>}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className={lang.code === currentLocale ? "bg-accent" : ""}
                    >
                        {lang.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
