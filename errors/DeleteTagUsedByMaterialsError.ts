export class DeleteTagUsedByMaterialsError extends Error {
    code = "tagHasMaterials"

    constructor(message: string) {
        super(message)
        this.name = "DeleteTagUsedByMaterialsError"
    }
}
