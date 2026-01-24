export class NotFoundMaterialError extends Error {
    code = "materialNotFound"

    constructor(message: string) {
        super(message)
        this.name = "NotFoundMaterialError"
    }
}
