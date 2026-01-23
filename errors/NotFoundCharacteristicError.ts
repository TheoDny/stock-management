export class NotFoundCharacteristicError extends Error {
    code = "characteristicNotFound"

    constructor(message: string) {
        super(message)
        this.name = "NotFoundCharacteristicError"
    }
}
