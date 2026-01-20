import { clsx, type ClassValue } from "clsx"
import { format, parseISO } from "date-fns"
import { enUS, fr } from "date-fns/locale"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string, formatString: string = "PPP", locale: "en" | "fr" = "en"): string {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    const localeObj = locale === "en" ? enUS : fr
    return format(dateObj, formatString, { locale: localeObj })
}

export function isObjectEmpty(obj: Record<string, unknown>) {
    return Object.keys(obj).length === 0
}

export async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}