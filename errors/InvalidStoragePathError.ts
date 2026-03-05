export class InvalidStoragePathError extends Error {
    constructor() {
        super("Invalid storage file path")
        this.name = "InvalidStoragePathError"
    }
}
