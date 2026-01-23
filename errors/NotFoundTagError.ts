export class NotFoundTagError extends Error {
    code = "tagNotFound"

    constructor(message: string) {
        super(message)
        this.name = "NotFoundTagError"
    }
}
