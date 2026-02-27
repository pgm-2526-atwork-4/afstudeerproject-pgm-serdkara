import Link from "next/link"
import { FileText, Play, CheckSquare, Settings, FileBarChart } from "lucide-react"

export function NavBar() {
    const navItems = [
        { name: "Dashboard", href: "/", icon: FileBarChart },
        { name: "Documents", href: "/documents", icon: FileText },
        { name: "Runs", href: "/runs/results", icon: Play },
        { name: "Configurations", href: "/configuration/checks", icon: Settings },
        { name: "Reports", href: "/reports", icon: CheckSquare },
    ]

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-6">
                <div className="mr-6 flex items-center space-x-2 text-primary font-bold text-lg">
                    <FileText className="h-6 w-6" />
                    <span>PolicyValidator</span>
                </div>
                <div className="flex flex-1 items-center space-x-6 text-sm font-medium">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="transition-colors hover:text-foreground/80 text-foreground/60 flex flex-row items-center gap-2"
                        >
                            <item.icon className="h-4 w-4" />
                            {item.name}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    )
}
