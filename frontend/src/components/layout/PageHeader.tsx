import * as React from "react"

interface PageHeaderProps {
    title: string
    description?: string
    action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
    return (
        <div className="flex items-center justify-between pb-6 mb-6 border-b">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    )
}
