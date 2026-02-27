"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

type User = {
    name: string
    email: string
}

type AuthContextType = {
    user: User | null
    login: (email: string, name: string) => void
    logout: () => void
    isTutorialActive: boolean
    startTutorial: () => void
    endTutorial: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isTutorialActive, setIsTutorialActive] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        // Load user from local storage
        const storedUser = localStorage.getItem("llm_validator_user")
        if (storedUser) {
            // eslint-disable-next-line
            setUser(JSON.parse(storedUser))
        } else {
            // Check if we need to redirect to login
            if (pathname !== "/login" && pathname !== "/register") {
                router.push("/login")
            }
        }

        // Check tutorial status
        const tutorialCompleted = localStorage.getItem("llm_validator_tutorial_complete")
        if (!tutorialCompleted) {
            setIsTutorialActive(true)
        }

        setIsLoading(false)
    }, [pathname, router])

    const login = (email: string, name: string) => {
        const newUser = { email, name }
        setUser(newUser)
        localStorage.setItem("llm_validator_user", JSON.stringify(newUser))
        router.push("/")
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem("llm_validator_user")
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
        <AuthContext.Provider value={{ user, login, logout, isTutorialActive, startTutorial, endTutorial }}>
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
