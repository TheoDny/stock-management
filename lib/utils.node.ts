import jwt from "jsonwebtoken"

export function generateInviteToken(name: string, email: string, expiresAt: Date): string {
    const payload = {
        name,
        email,
        exp: expiresAt.getTime() / 1000, // Convert to seconds
    }

    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is required in configuration server")
    }

    return jwt.sign(payload, process.env.JWT_SECRET)
}