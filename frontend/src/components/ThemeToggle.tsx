"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // useEffect only runs on the client, so now we can safely show the UI
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <button className="h-10 w-10 flex items-center justify-center rounded-full bg-card border border-border text-muted-foreground shadow-sm">
                <Moon className="h-5 w-5 opacity-50" />
            </button>
        )
    }

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200 shadow-sm"
        >
            {theme === "light" ? (
                <Moon className="h-5 w-5" />
            ) : (
                <Sun className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle theme</span>
        </button>
    )
}
