import { clsx, type ClassValue } from "clsx"
import { format, parseISO } from "date-fns"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string, formatString: string = "PPP"): string {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    return format(dateObj, formatString)
}

export function isObjectEmpty(obj: Record<string, unknown>) {
    return Object.keys(obj).length === 0
}

export async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}