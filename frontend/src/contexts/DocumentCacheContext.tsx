"use client"

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from "react"

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

type PersistedCachePayload = {
    version: 1
    runState: RunViewerState | null
}

const USER_KEY = "llm_validator_user"
const RUN_STATE_CACHE_PREFIX = "llm_validator_last_run_state_v1"

function getCurrentUserId(): string {
    if (typeof window === "undefined") return "anonymous"
    try {
        const raw = localStorage.getItem(USER_KEY)
        if (!raw) return "anonymous"
        const parsed = JSON.parse(raw) as { id?: string }
        return String(parsed?.id || "anonymous")
    } catch {
        return "anonymous"
    }
}

function sanitizeRunState(state: RunViewerState): RunViewerState {
    return {
        ...state,
        // Keep persistent payload small; document text is fetched separately by document_id.
        documentParagraphs: [],
    }
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
    const storageKey = useMemo(() => `${RUN_STATE_CACHE_PREFIX}:${getCurrentUserId()}`, [])

    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey)
            if (!raw) return
            const parsed = JSON.parse(raw) as PersistedCachePayload
            if (parsed?.version !== 1) return
            setLastRunState(parsed.runState || null)
        } catch {
            // Ignore malformed cache payloads.
        }
    }, [storageKey])

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
        const sanitized = sanitizeRunState(state)
        setLastRunState(sanitized)
        try {
            const payload: PersistedCachePayload = { version: 1, runState: sanitized }
            localStorage.setItem(storageKey, JSON.stringify(payload))
        } catch {
            // Ignore quota/persistence issues; in-memory cache still works.
        }
    }, [storageKey])

    const clearRunState = useCallback(() => {
        setLastRunState(null)
        try {
            localStorage.removeItem(storageKey)
        } catch {
            // Ignore storage errors.
        }
    }, [storageKey])

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
