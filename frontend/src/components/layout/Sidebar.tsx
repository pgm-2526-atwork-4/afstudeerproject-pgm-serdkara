"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, Zap, Settings, LayoutDashboard } from "lucide-react"

export function Sidebar() {
    const pathname = usePathname()

    const navItems = [
        { name: "Dashboard", href: "/", icon: LayoutDashboard, stepId: "dashboard" },
        { name: "Documents", href: "/documents", icon: FileText, stepId: "documents" },
        { name: "Configuration", href: "/configuration/checks", icon: Settings, stepId: "configuration" },
        { name: "Runs", href: "/runs/results", icon: Zap, stepId: "runs" },
    ]

    const isAuthPage = pathname === "/login" || pathname === "/register"
    if (isAuthPage) return null

    return (
        <div className="w-[250px] bg-card min-h-screen flex flex-col border-r border-border shrink-0 shadow-[2px_0_8px_rgba(0,0,0,0.3)]">
            <div className="px-4 py-6 pb-2">
                <div
                    className="px-4 font-semibold mb-8 text-[18px]"
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}
                >
                    🛡️ LLM Policy Validator
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-2 px-4">
                {navItems.map((item, index) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))

                    return (
                        <div key={item.href}>
                            {index === 1 && (
                                <div className="h-6 border-b border-border my-2"></div>
                            )}
                            <Link
                                href={item.href}
                                data-tutorial-step={item.stepId}
                                className={`flex items-center gap-[10px] px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${isActive
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                    }`}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </Link>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
