import { Characteristic, CharacteristicType } from "@/prisma/generated/browser"
import { CharacteristicBoolean, CharacteristicDate, CharacteristicDateRange, CharacteristicFile, CharacteristicMulti, CharacteristicMultiText, CharacteristicString, CharacteristicValueFile, CharacteristicValueFileClient, MaterialCharacteristic, MaterialCharacteristicClient } from "@/types/characteristic.type"
import { toast } from "sonner"


export const getTypeColor = (type: CharacteristicType) => {
    const typeColors: Record<CharacteristicType, string> = {
        checkbox: "bg-cyan-100 text-cyan-800",
        select: "bg-green-100 text-green-800",
        radio: "bg-purple-100 text-purple-800",
        multiSelect: "bg-indigo-100 text-indigo-800",
        text: "bg-gray-100 text-gray-800",
        textarea: "bg-stone-100 text-gray-800",
        multiText: "bg-zinc-100 text-gray-800",
        multiTextArea: "bg-slate-100 text-gray-800",
        number: "bg-amber-100 text-amber-800",
        float: "bg-amber-100 text-amber-800",
        email: "bg-pink-100 text-pink-800",
        date: "bg-red-300 text-red-900",
        dateHour: "bg-red-100 text-red-800",
        dateRange: "bg-orange-300 text-orange-900",
        dateHourRange: "bg-orange-100 text-orange-800",
        link: "bg-blue-100 text-blue-800",
        file: "bg-teal-100 text-teal-800",
        boolean: "bg-violet-100 text-violet-800",
    }

    return typeColors[type] || "bg-gray-100 text-gray-800"
}

export function buildCharacteristicDefaultValue(characteristic: Characteristic): MaterialCharacteristicClient {
    const type = characteristic.type

    // Create base structure with characteristic data
    const base = {
        characteristicId: characteristic.id,
        Characteristic: characteristic as any,
    }

    if (
        type === "text" ||
        type === "textarea" ||
        type === "link" ||
        type === "email" ||
        type === "number" ||
        type === "float"
    ) {
        return {
            ...base,
            value: "",
            Characteristic: characteristic as CharacteristicString,
        }
    }

    if (type === "multiText" || type === "multiTextArea") {
        return {
            ...base,
            value: {
                multiText: [{ title: "", text: "" }],
            },
            Characteristic: characteristic as CharacteristicMultiText,
        }
    }

    if (type === "multiSelect" || type === "select" || type === "checkbox" || type === "radio") {
        return {
            ...base,
            value: [],
            Characteristic: characteristic as CharacteristicMulti,
        }
    }

    if (type === "boolean") {
        return {
            ...base,
            value: false,
            Characteristic: characteristic as CharacteristicBoolean,
        }
    }

    if (type === "date" || type === "dateHour") {
        return {
            ...base,
            value: { date: new Date() },
            Characteristic: characteristic as CharacteristicDate,
        }
    }

    if (type === "dateRange" || type === "dateHourRange") {
        return {
            ...base,
            value: { from: new Date(), to: new Date() },
            Characteristic: characteristic as CharacteristicDateRange,
        }
    }

    if (type === "file") {
        return {
            ...base,
            value: {
                file: [],
                fileToAdd: [],
                fileToDelete: [],
            },
            Characteristic: characteristic as CharacteristicFile,
        }
    }

    // Default case
    return {
        ...base,
        value: "",
        Characteristic: characteristic as CharacteristicString,
    }
}

export function isCharacteristicValueFile(value: MaterialCharacteristic): value is CharacteristicValueFile {
    return value.Characteristic.type === "file"
}

export function isCharacteristicValueFileClient(
    value: MaterialCharacteristicClient,
): value is CharacteristicValueFileClient {
    return value.Characteristic.type === "file"
}

/**
 * Type for next-safe-action result
 */
type ActionResult<T = unknown> = {
    data?: T
    validationErrors?: Record<string, string[] | { _errors?: string[] }>
    serverError?: string
}

/**
 * Options for handling action results
 */
type HandleActionResultOptions = {
    /**
     * Toast object with error and success methods (defaults to sonner toast)
     */
    toast?: {
        error: (message: string) => void
        success: (message: string) => void
    }
    /**
     * Translation function (from next-intl useTranslations)
     */
    t?: (key: string) => string
    /**
     * Base translation key for error messages (e.g., "Configuration.tags.dialog.error")
     */
    errorTranslationKey?: string
    /**
     * Default error message when serverError occurs and no translation is found
     */
    defaultServerErrorMessage?: string
    /**
     * Default error message when validationErrors occur and no translation is found
     */
    defaultValidationErrorMessage?: string
    /**
     * Success message to display when action succeeds
     */
    successMessage?: string
    /**
     * Whether to log errors to console (default: true)
     */
    logErrors?: boolean
}

/**
 * Handles the result of a next-safe-action execution, displaying appropriate toast messages
 * and returning whether the action was successful.
 *
 * @param result - The result object from a next-safe-action execution
 * @param options - Configuration options for error handling and toast display
 * @returns true if the action was successful (data exists), false otherwise
 *
 * @example
 * ```tsx
 * const result = await createTagAction({ name: "Tag", color: "#fff" })
 * const success = handleActionResult(result, {
 *   t,
 *   errorTranslationKey: "Configuration.tags.dialog.error",
 *   successMessage: t("createSuccess")
 * })
 * if (success) {
 *   // Handle success
 * }
 * ```
 */
export function handleActionResult<T = unknown>(
    result: ActionResult<T> | undefined | null,
    options: HandleActionResultOptions = {},
): boolean {
    const {
        toast: toastInstance = toast,
        t,
        errorTranslationKey = "error",
        defaultServerErrorMessage = "An error occurred",
        defaultValidationErrorMessage = "Validation error",
        successMessage,
        logErrors = true,
    } = options

    // If no result, treat as error
    if (!result) {
        if (logErrors) {
            console.error("No result returned from action")
        }
        toastInstance.error(defaultServerErrorMessage)
        return false
    }

    // Handle server error
    if (result.serverError) {
        if (logErrors) {
            console.error("Server error:", result.serverError)
        }

        let errorMessage = defaultServerErrorMessage

        // Try to get translated error message by code
        if (t && errorTranslationKey) {
            const translatedError = t(`${errorTranslationKey}.${result.serverError}`)
            if (translatedError && translatedError !== `${errorTranslationKey}.${result.serverError}`) {
                errorMessage = translatedError
            } else if (t(defaultServerErrorMessage) !== defaultServerErrorMessage) {
                errorMessage = t(defaultServerErrorMessage)
            }
        }

        toastInstance.error(errorMessage)
        return false
    }

    // Handle validation errors
    if (result.validationErrors) {
        if (logErrors) {
            console.error("Validation errors:", result.validationErrors)
        }

        const errorMessages = Object.entries(result.validationErrors)
            .map(([field, errors]) => {
                // Handle array of strings
                if (Array.isArray(errors) && errors.length > 0) {
                    const errorMessage = errors[0] as string

                    // Try to detect error type from message
                    let errorType: string | null = null
                    const lowerMessage = errorMessage.toLowerCase()
                    if (lowerMessage.includes("at least")) {
                        errorType = "min"
                    } else if (lowerMessage.includes("at most") || lowerMessage.includes("valid")) {
                        errorType = "max"
                    } else if (lowerMessage.includes("required")) {
                        errorType = "required"
                    }

                    // Try to get translated error message
                    if (t && errorTranslationKey && errorType) {
                        const translatedError = t(`${errorTranslationKey}.${field}.${errorType}`)
                        if (translatedError && translatedError !== `${errorTranslationKey}.${field}.${errorType}`) {
                            return translatedError
                        }
                    }

                    // Fallback to original error message
                    return errorMessage
                }

                // Handle object with _errors array
                if (typeof errors === "object" && errors !== null && "_errors" in errors) {
                    const errorArray = errors._errors
                    if (Array.isArray(errorArray) && errorArray.length > 0) {
                        return errorArray[0] as string
                    }
                }

                return null
            })
            .filter((msg): msg is string => msg !== null)

        if (errorMessages.length > 0) {
            toastInstance.error(errorMessages.join(", "))
        } else {
            toastInstance.error(
                t && errorTranslationKey
                    ? t(defaultValidationErrorMessage) !== defaultValidationErrorMessage
                        ? t(defaultValidationErrorMessage)
                        : defaultValidationErrorMessage
                    : defaultValidationErrorMessage,
            )
        }

        return false
    }

    // Check if data exists (success)
    if (!result.data) {
        if (logErrors) {
            console.error("No data returned from action")
        }
        toastInstance.error(defaultServerErrorMessage)
        return false
    }

    // Success - display success message if provided
    if (successMessage) {
        toastInstance.success(successMessage)
    }

    return true
}