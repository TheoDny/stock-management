export class DeleteCharacteristicUsedByMaterialsError extends Error {
    code = "characteristicHasMaterials"

    constructor(message: string) {
        super(message)
        this.name = "DeleteCharacteristicUsedByMaterialsError"
    }
}
