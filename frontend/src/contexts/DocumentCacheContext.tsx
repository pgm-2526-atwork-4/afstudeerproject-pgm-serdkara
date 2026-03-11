"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

interface CachedDoc {
    documentId: string
    documentName: string
    paragraphs: string[]
}

interface RunViewerState {
    runId: string
    documentId: string | null
    documentName: string
    documentParagraphs: string[]
    checks: any[]
    runStatus: string
    completedChecks: number
    totalChecks: number
    activeCheck: string | null
}

interface DocumentCacheContextType {
    // Document content cache (by document ID)
    getDoc: (documentId: string) => CachedDoc | null
    setDoc: (documentId: string, documentName: string, paragraphs: string[]) => void
    // Full run viewer state (last viewed run)
    lastRunState: RunViewerState | null
    saveRunState: (state: RunViewerState) => void
    clearRunState: () => void
}

const DocumentCacheContext = createContext<DocumentCacheContextType | null>(null)

export function DocumentCacheProvider({ children }: { children: ReactNode }) {
    const [docCache, setDocCache] = useState<Record<string, CachedDoc>>({})
    const [lastRunState, setLastRunState] = useState<RunViewerState | null>(null)

    const getDoc = useCallback((documentId: string) => {
        return docCache[documentId] || null
    }, [docCache])

    const setDoc = useCallback((documentId: string, documentName: string, paragraphs: string[]) => {
        setDocCache(prev => ({
            ...prev,
            [documentId]: { documentId, documentName, paragraphs }
        }))
    }, [])

    const saveRunState = useCallback((state: RunViewerState) => {
        setLastRunState(state)
    }, [])

    const clearRunState = useCallback(() => {
        setLastRunState(null)
    }, [])

    return (
        <DocumentCacheContext.Provider value={{ getDoc, setDoc, lastRunState, saveRunState, clearRunState }}>
            {children}
        </DocumentCacheContext.Provider>
    )
}

export function useDocumentCache() {
    const ctx = useContext(DocumentCacheContext)
    if (!ctx) throw new Error("useDocumentCache must be used within DocumentCacheProvider")
    return ctx
}
