import React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
    size?: "sm" | "default" | "lg" | "icon"
}

const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-5 w-5",
    lg: "h-8 w-8",
    icon: "h-10 w-10",
}

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
    ({ className, size = "default", ...props }, ref) => {
        return (
            <Loader2
                ref={ref}
                className={cn("animate-spin text-muted-foreground", sizeClasses[size], className)}
                {...props}
            />
        )
    }
)
Spinner.displayName = "Spinner"

export { Spinner }
