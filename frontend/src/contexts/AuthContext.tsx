"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { apiUrl, authFetch } from "@/lib/api"

type User = {
    id: string
    name: string
    email: string
}

type AuthContextType = {
    user: User | null
    login: (email: string, password: string) => Promise<void>
    register: (name: string, email: string, password: string) => Promise<string>
    logout: () => void
    isTutorialActive: boolean
    startTutorial: () => void
    endTutorial: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const USER_KEY = "llm_validator_user"
const TOKEN_KEY = "llm_validator_auth_token"

function clearAuthStorage() {
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(TOKEN_KEY)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isTutorialActive, setIsTutorialActive] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        const bootstrapAuth = async () => {
            const storedUser = localStorage.getItem(USER_KEY)
            const storedToken = localStorage.getItem(TOKEN_KEY)

            if (storedUser && storedToken) {
                try {
                    const res = await authFetch("/api/auth/me")
                    if (res.ok) {
                        const payload = await res.json()
                        setUser(payload.user)
                    } else {
                        clearAuthStorage()
                        if (pathname !== "/login" && pathname !== "/register") {
                            router.push("/login")
                        }
                    }
                } catch {
                    clearAuthStorage()
                    if (pathname !== "/login" && pathname !== "/register") {
                        router.push("/login")
                    }
                }
            } else if (pathname !== "/login" && pathname !== "/register") {
                router.push("/login")
            }

            const tutorialCompleted = localStorage.getItem("llm_validator_tutorial_complete")
            if (!tutorialCompleted) {
                setIsTutorialActive(true)
            }

            setIsLoading(false)
        }

        bootstrapAuth()
    }, [pathname, router])

    const login = async (email: string, password: string) => {
        const res = await fetch(apiUrl("/api/auth/login"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        })

        const payload = await res.json().catch(() => ({}))
        if (!res.ok) {
            throw new Error(payload.error || "Login failed")
        }

        const newUser = payload.user as User
        const token = String(payload.token || "")
        if (!token) {
            throw new Error("Missing JWT token from server")
        }

        setUser(newUser)
        localStorage.setItem(USER_KEY, JSON.stringify(newUser))
        localStorage.setItem(TOKEN_KEY, token)
        router.push("/")
    }

    const register = async (name: string, email: string, password: string) => {
        const res = await fetch(apiUrl("/api/auth/register"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        })

        const payload = await res.json().catch(() => ({}))
        if (!res.ok) {
            throw new Error(payload.error || "Registration failed")
        }

        const baseMessage = String(payload.message || "Registration submitted")
        const mailWarning = payload.mail_warning ? ` ${String(payload.mail_warning)}` : ""
        return `${baseMessage}${mailWarning}`
    }

    const logout = () => {
        setUser(null)
        clearAuthStorage()
        router.push("/login")
    }

    const endTutorial = () => {
        setIsTutorialActive(false)
        localStorage.setItem("llm_validator_tutorial_complete", "true")
    }

    const startTutorial = () => {
        setIsTutorialActive(true)
    }

    if (isLoading) {
        return <div className="min-h-screen bg-background flex flex-col items-center justify-center">Loading...</div>
    }

    return (
        <AuthContext.Provider value={{ user, login, register, logout, isTutorialActive, startTutorial, endTutorial }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
