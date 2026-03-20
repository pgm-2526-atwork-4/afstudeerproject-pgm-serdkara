import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] pb-2">
            {/* Header Bar */}
            <div className="flex items-center justify-between mb-4 shrink-0 mt-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <Skeleton className="h-8 w-64" />
                    </div>
                    <Skeleton className="h-4 w-96 mt-2" />
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right flex flex-col items-end">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-2 w-48 rounded-full" />
                    </div>
                    <Skeleton className="h-9 w-28 rounded-lg" />
                </div>
            </div>

            {/* Main Split View */}
            <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
                {/* Left Pane */}
                <Skeleton className="w-5/12 h-full rounded-xl" />

                {/* Right Pane */}
                <div className="w-7/12 flex gap-4 min-h-0">
                    {/* Checks Navigation Sidebar */}
                    <Skeleton className="w-1/3 h-full rounded-xl" />

                    {/* Active Check Details */}
                    <Skeleton className="flex-1 h-full rounded-xl" />
                </div>
            </div>
        </div>
    )
}
