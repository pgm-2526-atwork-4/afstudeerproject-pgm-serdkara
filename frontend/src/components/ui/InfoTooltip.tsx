"use client"

import { useState } from "react"
import { Info, X } from "lucide-react"

export function InfoTooltip({ title, children }: { title: string, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <button
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsOpen(true)
                }}
                className="text-muted-foreground hover:text-primary transition-colors inline-flex cursor-pointer ml-1.5 align-middle"
                aria-label={`More information about ${title}`}
            >
                <Info className="w-4 h-4" />
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()} // Prevent clicks inside dialog from closing it
                    >
                        <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Info className="w-5 h-5 text-primary" /> {title}
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 text-sm leading-relaxed text-foreground space-y-4">
                            {children}
                        </div>
                        <div className="p-4 border-t border-border bg-background flex justify-end">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
