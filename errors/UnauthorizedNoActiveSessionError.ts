export class UnauthorizedNoActiveSessionError extends Error {
    code = "noActiveSession"
    
    constructor(message: string) {
        super(message)
        this.name = "UnauthorizedNoActiveSessionError"
    }
}
