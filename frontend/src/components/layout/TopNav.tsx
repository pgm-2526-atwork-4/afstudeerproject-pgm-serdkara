"use client"

import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { ThemeToggle } from "@/components/ThemeToggle"
import { LogOut } from "lucide-react"

export function TopNav() {
    const pathname = usePathname()
    const { user, logout, startTutorial } = useAuth()

    const isAuthPage = pathname === "/login" || pathname === "/register"

    if (isAuthPage) {
        return null
    }

    return (
        <div className="px-8 py-4 flex justify-end items-center shrink-0 gap-4">
            {user && (
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">
                        {user.name}
                    </span>
                    <button
                        onClick={logout}
                        title="Logout"
                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-rose-500"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            )}
            <button
                onClick={startTutorial}
                className="text-xs font-semibold px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-full transition-colors border border-primary/20"
            >
                Start Tour
            </button>
            <ThemeToggle />
        </div>
    )
}
