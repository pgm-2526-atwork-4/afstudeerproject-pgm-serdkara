import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 rounded-xl border border-border bg-card p-8 shadow-sm">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>

                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-10 w-full" />
                    </div>

                    <Skeleton className="h-10 w-full mt-6" />
                </div>

                <div className="mt-6 flex justify-center">
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>
        </div>
    )
}
