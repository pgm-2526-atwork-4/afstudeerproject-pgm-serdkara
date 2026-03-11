"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { FileText, CheckCircle2, Play, Search, AlertTriangle, AlertCircle, ThumbsUp, ThumbsDown, MessageSquareCode, RefreshCw, Flag, Settings2, ShieldCheck, ChevronRight, ChevronDown } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { InfoTooltip } from "@/components/ui/InfoTooltip"
import { Spinner } from "@/components/ui/Spinner"
import { useDocumentCache } from "@/contexts/DocumentCacheContext"

function RunResultsContent() {
    const searchParams = useSearchParams()
    const runId = searchParams.get("runId")
    const isNewRun = searchParams.get("newRun") === "true" || !!runId
    const { theme, resolvedTheme } = useTheme()
    const isLight = theme === 'system' ? resolvedTheme === 'light' : theme === 'light'

    const [completedChecks, setCompletedChecks] = useState<number>(isNewRun ? 0 : 8)
    const [totalChecks, setTotalChecks] = useState<number>(isNewRun ? 0 : 8)
    const [activeCheck, setActiveCheck] = useState<string | null>(isNewRun ? null : "9.1.1")
    const [showConfigModal, setShowConfigModal] = useState(false)
    const [showConfigChecks, setShowConfigChecks] = useState(false)
    const [isReextracting, setIsReextracting] = useState(false)
    const [isRejudging, setIsRejudging] = useState(false)
    const [checks, setChecks] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(!!runId)
    const [documentName, setDocumentName] = useState<string>("")
    const [documentParagraphs, setDocumentParagraphs] = useState<string[]>([])
    const [documentId, setDocumentId] = useState<string | null>(null)
    const [reviewingState, setReviewingState] = useState<'idle' | 'agree' | 'disagree' | 'flag'>('idle')
    const [extractionModel, setExtractionModel] = useState("Loading...")
    const [judgeModel, setJudgeModel] = useState("Loading...")

    // Document Viewer Pagination State
    const [docPage, setDocPage] = useState(1)
    const totalDocPages = 3

    // Sequential auto-scroll refs
    const docViewerRef = useRef<HTMLDivElement>(null)
    const scrollCancelRef = useRef<{ cancelled: boolean }>({ cancelled: false })

    // Sequential auto-scroll through highlighted paragraphs
    useEffect(() => {
        // Cancel any previous scroll sequence
        scrollCancelRef.current.cancelled = true
        const token = { cancelled: false }
        scrollCancelRef.current = token

        if (!activeCheck || !docViewerRef.current) return

        const container = docViewerRef.current

        // Cancel on user scroll
        const onUserScroll = () => { token.cancelled = true }
        container.addEventListener('wheel', onUserScroll, { passive: true })
        container.addEventListener('touchmove', onUserScroll, { passive: true })

        // Start sequential scroll after a short render delay
        const startTimeout = setTimeout(async () => {
            const highlights = container.querySelectorAll<HTMLElement>('[data-highlight="true"]')
            if (highlights.length === 0 || token.cancelled) return

            for (let i = 0; i < highlights.length; i++) {
                if (token.cancelled) break
                highlights[i].scrollIntoView({ behavior: 'smooth', block: 'start' })

                // Wait 10 seconds before scrolling to the next (skip wait on last item)
                if (i < highlights.length - 1) {
                    await new Promise<void>(resolve => {
                        const waitTimeout = setTimeout(resolve, 10000)
                        // Check cancellation periodically
                        const checkInterval = setInterval(() => {
                            if (token.cancelled) { clearTimeout(waitTimeout); clearInterval(checkInterval); resolve() }
                        }, 200)
                    })
                }
            }
        }, 200)

        return () => {
            token.cancelled = true
            clearTimeout(startTimeout)
            container.removeEventListener('wheel', onUserScroll)
            container.removeEventListener('touchmove', onUserScroll)
        }
    }, [activeCheck, documentParagraphs, checks])

    // Link active check to document page
    useEffect(() => {
        if (!activeCheck) return;
        if (activeCheck.startsWith('9.')) setDocPage(1);
        if (activeCheck.startsWith('10.')) setDocPage(2);
    }, [activeCheck]);

    // Fetch Configuration Settings
    useEffect(() => {
        fetch("http://localhost:5000/api/config/llm")
            .then(res => res.json())
            .then(data => {
                if (data.extraction_model) setExtractionModel(data.extraction_model)
                if (data.judge_model) setJudgeModel(data.judge_model)
            })
            .catch(err => console.error("Failed to fetch llm config", err))
    }, [])

    // Global document & run state cache
    const { getDoc, setDoc: setCachedDoc, lastRunState, saveRunState } = useDocumentCache()

    // Fetch document content whenever documentId changes (cache-first)
    useEffect(() => {
        if (!documentId) return

        // Check cache first
        const cached = getDoc(documentId)
        if (cached) {
            setDocumentParagraphs(cached.paragraphs)
            setDocumentName(cached.documentName)
            return
        }

        // Not cached — fetch from API and store in cache
        const fetchDoc = async () => {
            try {
                const docRes = await fetch(`http://localhost:5000/api/files/${documentId}/content`)
                if (docRes.ok) {
                    const docData = await docRes.json()
                    if (docData.paragraphs) {
                        setDocumentParagraphs(docData.paragraphs)
                        setDocumentName(docData.document_name || "")
                        setCachedDoc(documentId, docData.document_name || "", docData.paragraphs)
                    }
                }
            } catch (docErr) {
                console.warn("Failed to fetch doc content:", docErr)
            }
        }
        fetchDoc()
    }, [documentId])

    // Track run status for polling
    const [runStatus, setRunStatus] = useState<string>("processing")

    // Persist the runId in a ref so transient null values from Next.js don't wipe real data
    const stableRunId = useRef<string | null>(runId)
    if (runId) stableRunId.current = runId

    // Helper function to format check data from API response
    const formatChecks = (apiChecks: any[]) => apiChecks.map((c: any) => ({
        id: c.check_id,
        title: c.name,
        status: c.judge_assessment?.verdict || 'fail',
        sourceText: c.instructions,
        extraction: c.extraction?.value || 'Extraction failed',
        judgeReasoning: c.judge_assessment?.reasoning || 'Evaluation failed',
        score: c.judge_assessment?.score || 0,
        rubric: c.judge_assessment?.rubric_breakdown || {},
        confidence: c.extraction?.confidence ? Math.round(c.extraction.confidence * 100) : 0,
        humanReview: c.human_review?.status || null
    }))

    // Fetch run data from backend (with polling for live updates)
    useEffect(() => {
        const activeRunId = stableRunId.current

        if (!activeRunId) {
            // Try to restore from cache (user navigated back via sidebar)
            if (lastRunState) {
                stableRunId.current = lastRunState.runId
                setChecks(lastRunState.checks)
                setTotalChecks(lastRunState.totalChecks)
                setCompletedChecks(lastRunState.completedChecks)
                setActiveCheck(lastRunState.activeCheck)
                setRunStatus(lastRunState.runStatus)
                setDocumentId(lastRunState.documentId)
                setDocumentName(lastRunState.documentName)
                setDocumentParagraphs(lastRunState.documentParagraphs)
                setIsLoading(false)
                return
            }
            // No cache, load dummy data
            setChecks(dummyChecks);
            setTotalChecks(dummyChecks.length);
            setCompletedChecks(dummyChecks.length);
            return;
        }

        // Set initial state for a new run
        setTotalChecks(4); // default number of checks
        setCompletedChecks(0);

        const fetchRunData = async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/runs/${activeRunId}`);
                if (res.ok) {
                    const data = await res.json();
                    setRunStatus(data.status || "processing");

                    if (data.checks && data.checks.length > 0) {
                        const formattedChecks = formatChecks(data.checks);
                        setChecks(formattedChecks);
                        setCompletedChecks(formattedChecks.length);

                        if (data.status === "complete") {
                            setTotalChecks(formattedChecks.length);
                        }

                        setActiveCheck(prev => prev || formattedChecks[0].id);
                    }

                    // Store document_id for the dedicated document-fetch effect
                    if (data.document_id) {
                        setDocumentId(data.document_id)
                    }
                }
            } catch (err) {
                console.warn("Error fetching run status:", err);
            } finally {
                setIsLoading(false);
            }
        };

        // Initial fetch
        fetchRunData();

        // Poll every 3 seconds while processing
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/runs/${activeRunId}`);
                if (res.ok) {
                    const data = await res.json();
                    setRunStatus(data.status || "processing");

                    if (data.checks && data.checks.length > 0) {
                        const formattedChecks = formatChecks(data.checks);
                        setChecks(formattedChecks);
                        setCompletedChecks(formattedChecks.length);

                        if (data.status === "complete") {
                            setTotalChecks(formattedChecks.length);
                        }

                        setActiveCheck(prev => prev || formattedChecks[0].id);
                    }

                    // Stop polling when done
                    if (data.status === "complete" || data.status === "error") {
                        clearInterval(interval);
                    }
                }
            } catch (err) {
                console.warn("Polling error:", err);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [runId]);

    // Save run state to global cache for instant restoration on re-navigation
    useEffect(() => {
        const activeRunId = stableRunId.current
        if (!activeRunId || checks.length === 0) return
        saveRunState({
            runId: activeRunId,
            documentId,
            documentName,
            documentParagraphs,
            checks,
            runStatus,
            completedChecks,
            totalChecks,
            activeCheck,
        })
    }, [checks, documentParagraphs, activeCheck, runStatus, completedChecks, totalChecks])

    const handleReExtract = async () => {
        if (!runId || !activeCheck) return;
        setIsReextracting(true);
        try {
            const res = await fetch(`http://localhost:5000/api/runs/${runId}/re-extract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ check_id: activeCheck })
            });
            if (res.ok) {
                const updatedRun = await res.json();
                // Find and update the specific check in the current state
                const targetCheck = updatedRun.checks.find((c: any) => c.check_id === activeCheck);
                if (targetCheck) {
                    setChecks(currentChecks => currentChecks.map(c =>
                        c.id === activeCheck ? {
                            ...c,
                            extraction: targetCheck.extraction?.value || 'Extraction failed'
                        } : c
                    ));
                }
            }
        } catch (err) {
            console.warn("Failed to re-extract", err);
        } finally {
            setIsReextracting(false);
        }
    };

    const handleReJudge = async () => {
        if (!runId || !activeCheck) return;
        setIsRejudging(true);
        try {
            const res = await fetch(`http://localhost:5000/api/runs/${runId}/re-judge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ check_id: activeCheck })
            });
            if (res.ok) {
                const updatedRun = await res.json();
                // Find and update the specific check in the current state
                const targetCheck = updatedRun.checks.find((c: any) => c.check_id === activeCheck);
                if (targetCheck) {
                    setChecks(currentChecks => currentChecks.map(c =>
                        c.id === activeCheck ? {
                            ...c,
                            status: targetCheck.judge_assessment?.verdict || 'fail',
                            judgeReasoning: targetCheck.judge_assessment?.reasoning || 'Evaluation failed',
                            score: targetCheck.judge_assessment?.score || 0,
                        } : c
                    ));
                }
            }
        } catch (err) {
            console.warn("Failed to re-judge", err);
        } finally {
            setIsRejudging(false);
        }
    };

    const handleReview = async (status: 'agree' | 'disagree' | 'flag') => {
        if (!runId || !activeCheck) return;
        setReviewingState(status);
        try {
            const res = await fetch(`http://localhost:5000/api/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    run_id: runId,
                    check_id: activeCheck,
                    status: status,
                    comments: ""
                })
            });
            if (res.ok) {
                const updatedRun = await res.json();
                const targetCheck = updatedRun.checks.find((c: any) => c.check_id === activeCheck);
                if (targetCheck && targetCheck.human_review) {
                    setChecks(currentChecks => currentChecks.map(c =>
                        c.id === activeCheck ? {
                            ...c,
                            humanReview: targetCheck.human_review.status
                        } : c
                    ));
                }
            }
        } catch (err) {
            console.warn("Failed to submit review", err);
        } finally {
            setReviewingState('idle');
        }
    };

    const progressPercentage = totalChecks === 0 ? 0 : (completedChecks / totalChecks) * 100

    // Mocked Checks Data
    const dummyChecks = [
        {
            id: "9.1.1",
            title: "Incident Response Plan Exists",
            status: "pass",
            sourceText: "The organization maintains a formal, documented incident response plan that provides guidance for responding to security incidents effectively.",
            extraction: "A formal incident response plan exists.",
            judgeReasoning: "The extraction correctly identifies the existence of the incident response plan as required by the check.",
            score: 5,
            rubric: { correctness: 5, completeness: 5, consistency: 5, relevance: 5, traceability: 5 },
            confidence: 94
        },
        {
            id: "9.1.2",
            title: "Incident Response Team Identified",
            status: "fail",
            sourceText: "A dedicated Incident Response Team (IRT) is responsible for handling all security incidents. The team includes the CISO and IT Manager.",
            extraction: "The IT department handles incidents.",
            judgeReasoning: "The extraction is incomplete and inaccurate. It mentions the 'IT department' generally, but fails to identify the specific 'Incident Response Team' and its key members (CISO, IT Manager) explicitly mentioned in the source.",
            score: 2,
            rubric: { correctness: 3, completeness: 1, consistency: 4, relevance: 2, traceability: 2 },
            confidence: 88
        },
        {
            id: "9.1.3",
            title: "Quarterly Incident Tabletop Exercises",
            status: "pass",
            sourceText: "The Incident Response Team (IRT) shall conduct tabletop exercises at least once per quarter to simulate varying attack scenarios.",
            extraction: "Tabletop exercises are conducted quarterly by the IRT.",
            judgeReasoning: "Perfect extraction. It accurately captures both the frequency (quarterly) and the actor (IRT) performing the tabletop exercises.",
            score: 5,
            rubric: { correctness: 5, completeness: 5, consistency: 5, relevance: 5, traceability: 5 },
            confidence: 98
        },
        {
            id: "10.1.1",
            title: "MFA Enforced for All Users",
            status: "flagged",
            sourceText: "Multi-factor authentication (MFA) must be enforced for all administrative accounts and remote access connections.",
            extraction: "MFA is required for all users.",
            judgeReasoning: "The extraction overgeneralizes. The policy specifically states MFA is for 'administrative accounts and remote access', not 'all users'. I am flagging this as a partial failure.",
            score: 3,
            rubric: { correctness: 2, completeness: 2, consistency: 4, relevance: 4, traceability: 3 },
            confidence: 72
        }
    ]

    return (
        <div className="flex flex-col h-auto md:h-[calc(100vh-8rem)] pb-2">

            {/* Header Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <span className="bg-primary/10 text-primary p-2 rounded-lg"><FileText className="w-6 h-6" /></span>
                        Analysis: {documentName || "Loading..."}
                    </h1>
                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                        <span>Run ID: <span className="font-mono">RUN-1005</span></span>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span>Profile: <strong>ISO 27001</strong></span>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span>Model: <strong>{extractionModel.split('/').pop() || extractionModel}</strong></span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-sm font-semibold mb-1 flex items-center justify-end gap-2">
                            {runStatus === "complete" ? (
                                <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Analysis Complete</>
                            ) : runStatus === "error" ? (
                                <><AlertCircle className="w-4 h-4 text-rose-500" /> Analysis Failed</>
                            ) : (
                                <><Spinner size="sm" className="w-4 h-4" /> Analysis in Progress</>
                            )}
                            <span className="text-muted-foreground font-normal ml-2">({completedChecks}/{totalChecks} checks complete)</span>
                        </div>
                        <div className="w-48 h-2 bg-sidebar rounded-full overflow-hidden border border-border">
                            <div
                                className={`h-full transition-all duration-500 ease-out ${runStatus === "complete" ? 'bg-emerald-500' : runStatus === "error" ? 'bg-rose-500' : 'bg-primary'}`}
                                style={{ width: `${progressPercentage}%` }}
                            ></div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowConfigModal(true)}
                        className="px-4 py-2 bg-sidebar border border-border hover:bg-background rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
                    >
                        <Settings2 className="w-4 h-4" /> Run Config
                    </button>
                </div>
            </div>

            {/* Config Modal Overlay */}
            {showConfigModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm shadow-2xl">
                    <div className="bg-sidebar border border-border rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Settings2 className="w-5 h-5 text-primary" /> Run Configuration Details
                            </h3>
                            <button
                                onClick={() => setShowConfigModal(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Checks & Evaluation</h4>
                                <div className="space-y-3">
                                    <div className="flex flex-col py-2 border-b border-border/30">
                                        <button
                                            onClick={() => setShowConfigChecks(!showConfigChecks)}
                                            className="flex items-center justify-between w-full hover:bg-background rounded px-1 -mx-1 transition-colors cursor-pointer"
                                        >
                                            <span className="text-sm font-medium">Checks Executed</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-mono text-primary font-semibold">{checks.length}</span>
                                                {showConfigChecks ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                            </div>
                                        </button>

                                        {showConfigChecks && (
                                            <div className="mt-3 space-y-1 bg-background/50 border border-border/50 rounded-lg p-2 max-h-40 overflow-y-auto">
                                                {checks.map(check => (
                                                    <div key={check.id} className="flex items-center gap-2 text-xs py-1.5 px-2 hover:bg-sidebar rounded transition-colors">
                                                        <span className="font-mono text-muted-foreground w-12 shrink-0">{check.id}</span>
                                                        <span className="text-foreground truncate">{check.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1 py-2">
                                        <span className="text-sm font-medium mb-1 flex items-center">
                                            Judge Rubric
                                            <InfoTooltip title="Judge Rubric">
                                                This is the set of rules used by the Judge LLM to evaluate the primary extraction. It scores the text out of 5 across multiple criteria to reach a final verdict.
                                            </InfoTooltip>
                                        </span>
                                        <span className="text-xs text-muted-foreground bg-background p-3 rounded-lg border border-border/50 leading-relaxed font-mono">
                                            1. Correctness (1-5)
                                            2. Completeness (1-5)
                                            3. Consistency (1-5)
                                            4. Security Relevance (1-5)
                                            5. Traceability (1-5)
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Model Selection</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-background border border-border/50 p-3 rounded-lg">
                                        <div className="text-xs text-muted-foreground mb-1">Primary LLM (Extraction)</div>
                                        <div className="font-medium text-sm break-all">{extractionModel}</div>
                                    </div>
                                    <div className="bg-background border border-border/50 p-3 rounded-lg">
                                        <div className="text-xs text-muted-foreground mb-1">Judge LLM (Evaluation)</div>
                                        <div className="font-medium text-sm break-all">{judgeModel}</div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Settings</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between py-2 border-b border-border/30">
                                        <span className="text-sm font-medium">Temperature</span>
                                        <span className="text-sm font-mono bg-background/50 px-2 py-0.5 rounded border border-border/50">0.0 (Deterministic)</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-border/30">
                                        <span className="text-sm font-medium">Profile Template</span>
                                        <span className="text-sm text-foreground">ISO 27001 Foundation</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-border bg-background flex justify-end">
                            <button
                                onClick={() => setShowConfigModal(false)}
                                className="px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Split View */}
            <div className="flex flex-col xl:flex-row gap-6 flex-1 xl:min-h-0 overflow-visible xl:overflow-hidden">

                {/* Left Pane: Inline Document Viewer */}
                <div className="w-full xl:w-5/12 h-[500px] xl:h-auto bg-sidebar border border-border rounded-xl shadow-sm flex flex-col overflow-hidden shrink-0">
                    <div className="p-3 border-b border-border/60 bg-white/[0.02] flex items-center justify-between shrink-0">
                        <div className="font-semibold text-sm flex items-center gap-2">
                            <Search className="w-4 h-4 text-muted-foreground" /> Document Viewer
                        </div>
                    </div>

                    <div ref={docViewerRef} className={`flex-1 p-8 overflow-y-auto leading-relaxed text-sm ${isLight ? 'bg-white' : 'bg-[#1e1e1e] text-gray-300'}`}>
                        {documentParagraphs.length > 0 ? (
                            <>
                                {documentParagraphs.map((para, i) => {
                                    const activeExtraction = checks.find(c => c.id === activeCheck)?.extraction || "";
                                    // Match by checking if key words from the extraction appear in the paragraph
                                    const extractionWords = activeExtraction.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
                                    const paraLower = para.toLowerCase();
                                    const matchCount = extractionWords.filter((w: string) => paraLower.includes(w)).length;
                                    const isTarget = extractionWords.length > 0 && matchCount >= Math.min(3, Math.ceil(extractionWords.length * 0.4));
                                    return (
                                        <p
                                            key={i}
                                            data-highlight={isTarget ? "true" : undefined}
                                            className={`mb-4 p-2 rounded-md transition-all break-words ${isTarget ? 'bg-primary/10 outline outline-2 outline-primary outline-offset-2 shadow-[0_0_12px_rgba(139,92,246,0.15)] scroll-mt-4' : ''}`}
                                        >
                                            {para}
                                        </p>
                                    );
                                })}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-70">
                                <Spinner className="mb-4" />
                                <p>Extracting document content...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Pane: Single-Check Focus */}
                <div className="w-full xl:w-7/12 flex flex-col xl:flex-row gap-4 xl:min-h-0">

                    {/* Checks Navigation Sidebar */}
                    <div className="w-full xl:w-1/3 h-[300px] xl:h-auto flex flex-col bg-sidebar border border-border rounded-xl shadow-sm overflow-hidden flex-shrink-0">
                        <div className="p-4 border-b border-border/60 bg-white/[0.02]">
                            <h3 className="font-semibold text-sm">Validations ({completedChecks}/{totalChecks})</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {checks.length === 0 && runStatus === "processing" ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                                    <Spinner size="default" />
                                    <span className="text-xs font-medium animate-pulse">Waiting for results...</span>
                                </div>
                            ) : (
                                checks.map((check, index) => (
                                    <button
                                        key={check.id}
                                        onClick={() => setActiveCheck(check.id)}
                                        disabled={index > completedChecks}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors cursor-pointer
                                        ${activeCheck === check.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-white/[0.04] text-foreground'}
                                        ${index > completedChecks ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                    >
                                        <div className="flex items-center gap-2 truncate pr-2">
                                            {index < completedChecks ? (
                                                <>
                                                    {check.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                                                    {check.status === 'fail' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                                                    {check.status === 'flagged' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                                                </>
                                            ) : index === completedChecks ? (
                                                <Spinner size="sm" className="w-4 h-4 text-primary shrink-0" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0"></div>
                                            )}
                                            <span className="truncate">{check.id}</span>
                                            {index === completedChecks && (
                                                <span className="text-[10px] text-primary ml-2 animate-pulse font-medium">Running...</span>
                                            )}
                                            {index > completedChecks && (
                                                <span className="text-[10px] text-muted-foreground ml-2 font-medium">Pending</span>
                                            )}
                                        </div>
                                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${activeCheck === check.id ? 'opacity-100 translate-x-1' : 'opacity-0 -translate-x-2'}`} />
                                    </button>
                                ))
                            )}
                        </div>
                        {/* Pagination at bottom of sidebar */}
                        <div className="p-3 border-t border-border/60 bg-white/[0.02] flex items-center justify-between mt-auto shrink-0">
                            <button className="text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-white/[0.05] cursor-pointer">Prev</button>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Page 1 of 2</span>
                            <button className="text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-white/[0.05] cursor-pointer">Next</button>
                        </div>
                    </div>

                    {/* Active Check Details */}
                    <div className="flex-1 min-h-[600px] md:min-h-0 flex flex-col bg-sidebar border border-border shadow-sm rounded-xl overflow-hidden relative">
                        {activeCheck ? (() => {
                            const check = checks.find(c => c.id === activeCheck);
                            if (!check) return null;
                            return (
                                <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-5 border-b border-border/50 bg-white/[0.01] shrink-0">
                                        <div className="flex items-center gap-3">
                                            {check.status === 'pass' && <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>}
                                            {check.status === 'fail' && <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20"><AlertCircle className="w-5 h-5 text-rose-500" /></div>}
                                            {check.status === 'flagged' && <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20"><AlertTriangle className="w-5 h-5 text-amber-500" /></div>}
                                            <div>
                                                <div className="text-xs font-bold text-muted-foreground mb-0.5">{check.id}</div>
                                                <h3 className="font-bold text-foreground text-lg leading-tight">{check.title}</h3>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Judge Score</span>
                                            <span className={`text-lg font-bold flex items-center gap-1.5 ${check.score >= 4 ? 'text-emerald-500' : check.score >= 3 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                {check.score}/5
                                            </span>
                                        </div>
                                    </div>

                                    {/* Scrollable Content */}
                                    <div className="p-6 flex-1 overflow-y-auto">
                                        <div className="space-y-8">
                                            {/* Column 1: Source */}
                                            <div className="space-y-3 relative">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                    <FileText className="w-4 h-4" /> Source Text
                                                </h4>
                                                <div className="text-sm border-l-2 border-primary/30 pl-4 leading-relaxed text-foreground bg-primary/5 py-3 pr-3 rounded-r-lg">
                                                    &quot;{check.sourceText}&quot;
                                                </div>
                                            </div>

                                            {/* Column 2: Extraction */}
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                    <MessageSquareCode className="w-4 h-4" /> Primary LLM Extraction
                                                </h4>
                                                <div className="text-sm bg-background p-4 rounded-xl border border-border/60 leading-relaxed text-foreground shadow-sm">
                                                    {check.extraction}
                                                </div>
                                            </div>

                                            {/* Column 3: Judge Assessment */}
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                    <ShieldCheck className="w-4 h-4" /> Conversational Judge
                                                    <InfoTooltip title="Conversational Judge">
                                                        The outcome of the Judge LLM evaluation. It provides a human-readable justification for the pass/fail verdict based on the defined scoring rubric.
                                                    </InfoTooltip>
                                                </h4>
                                                <div className={`text-sm p-4 rounded-xl border leading-relaxed shadow-sm ${check.status === 'pass' ? (isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200') :
                                                    check.status === 'fail' ? (isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-500/10 border-rose-500/20 text-rose-200') :
                                                        (isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-500/10 border-amber-500/20 text-amber-200')
                                                    }`}>
                                                    <div className="font-semibold mb-3 flex items-center justify-between opacity-90">
                                                        <div className="flex items-center gap-2">
                                                            Verdict: {check.status.toUpperCase()}
                                                        </div>
                                                        <div className="text-xs font-medium px-2 py-0.5 rounded-full bg-background/50 border border-border/50 text-foreground">
                                                            Confidence: {check.confidence}%
                                                        </div>
                                                    </div>
                                                    <p className="mb-4">
                                                        {check.judgeReasoning}
                                                    </p>
                                                    <div className="space-y-1.5 border-t border-black/10 dark:border-white/10 pt-3 mt-3">
                                                        <div className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-2 flex items-center">
                                                            Rubric Scores
                                                            <InfoTooltip title="Rubric Breakdown">
                                                                Scores from 1-5 for individual criteria. A final verdict relies on an aggregated assessment of these dimensions.
                                                            </InfoTooltip>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div className="flex justify-between items-center bg-background/40 dark:bg-background/20 px-2.5 py-1.5 rounded text-foreground">
                                                                <span className="opacity-80">Correctness</span>
                                                                <span className="font-bold">{check.rubric.correctness} <span className="opacity-50 font-normal">/5</span></span>
                                                            </div>
                                                            <div className="flex justify-between items-center bg-background/40 dark:bg-background/20 px-2.5 py-1.5 rounded text-foreground">
                                                                <span className="opacity-80">Completeness</span>
                                                                <span className="font-bold">{check.rubric.completeness} <span className="opacity-50 font-normal">/5</span></span>
                                                            </div>
                                                            <div className="flex justify-between items-center bg-background/40 dark:bg-background/20 px-2.5 py-1.5 rounded text-foreground">
                                                                <span className="opacity-80">Consistency</span>
                                                                <span className="font-bold">{check.rubric.consistency} <span className="opacity-50 font-normal">/5</span></span>
                                                            </div>
                                                            <div className="flex justify-between items-center bg-background/40 dark:bg-background/20 px-2.5 py-1.5 rounded text-foreground">
                                                                <span className="opacity-80">Relevance</span>
                                                                <span className="font-bold">{check.rubric.relevance} <span className="opacity-50 font-normal">/5</span></span>
                                                            </div>
                                                            <div className="flex justify-between items-center bg-background/40 dark:bg-background/20 px-2.5 py-1.5 rounded text-foreground col-span-2">
                                                                <span className="opacity-80">Traceability</span>
                                                                <span className="font-bold">{check.rubric.traceability} <span className="opacity-50 font-normal">/5</span></span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="p-4 border-t border-border/50 bg-white/[0.01] shrink-0 flex items-center justify-between gap-4 flex-wrap">
                                        <div className="flex bg-background border border-border rounded-lg overflow-hidden shadow-sm">
                                            <button
                                                onClick={() => handleReview('agree')}
                                                disabled={reviewingState !== 'idle'}
                                                className={`px-3 py-2 text-xs font-medium flex items-center gap-2 border-r border-border transition-colors group cursor-pointer ${check.humanReview === 'agree' ? 'bg-emerald-500/10 text-emerald-500' : 'hover:bg-emerald-500/10 hover:text-emerald-500'}`}
                                            >
                                                {reviewingState === 'agree' ? <Spinner size="sm" className="w-3.5 h-3.5" /> : <ThumbsUp className={`w-3.5 h-3.5 ${check.humanReview !== 'agree' ? 'group-hover:scale-110' : ''} transition-transform ${check.humanReview === 'agree' ? 'fill-current' : ''}`} />}
                                                Agree
                                            </button>
                                            <button
                                                onClick={() => handleReview('disagree')}
                                                disabled={reviewingState !== 'idle'}
                                                className={`px-3 py-2 text-xs font-medium flex items-center gap-2 border-r border-border transition-colors group cursor-pointer ${check.humanReview === 'disagree' ? 'bg-rose-500/10 text-rose-500' : 'hover:bg-rose-500/10 hover:text-rose-500'}`}
                                            >
                                                {reviewingState === 'disagree' ? <Spinner size="sm" className="w-3.5 h-3.5" /> : <ThumbsDown className={`w-3.5 h-3.5 ${check.humanReview !== 'disagree' ? 'group-hover:scale-110' : ''} transition-transform ${check.humanReview === 'disagree' ? 'fill-current' : ''}`} />}
                                                Disagree
                                            </button>
                                            <button
                                                onClick={() => handleReview('flag')}
                                                disabled={reviewingState !== 'idle'}
                                                className={`px-3 py-2 text-xs font-medium flex items-center gap-2 transition-colors group cursor-pointer ${check.humanReview === 'flag' ? 'bg-amber-500/10 text-amber-500' : 'hover:bg-amber-500/10 hover:text-amber-500'}`}
                                            >
                                                {reviewingState === 'flag' ? <Spinner size="sm" className="w-3.5 h-3.5" /> : <Flag className={`w-3.5 h-3.5 ${check.humanReview !== 'flag' ? 'group-hover:scale-110' : ''} transition-transform ${check.humanReview === 'flag' ? 'fill-current' : ''}`} />}
                                                Flag
                                            </button>
                                        </div>

                                        <div className="flex space-x-2">
                                            <button
                                                onClick={handleReExtract}
                                                disabled={isReextracting}
                                                className="px-3 py-2 text-xs font-semibold bg-background border border-border hover:bg-sidebar rounded-md flex items-center gap-2 transition-colors text-muted-foreground hover:text-foreground shadow-sm disabled:opacity-50 cursor-pointer"
                                            >
                                                {isReextracting ? <Spinner size="sm" className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                                {isReextracting ? "Extracting..." : "Re-extract"}
                                            </button>
                                            <button
                                                onClick={handleReJudge}
                                                disabled={isRejudging}
                                                className="px-3 py-2 text-xs font-semibold bg-primary/10 text-primary border border-transparent hover:border-primary/30 rounded-md flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                                            >
                                                {isRejudging ? <Spinner size="sm" className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                                                {isRejudging ? "Evaluating..." : "Re-judge"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })() : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center animate-in fade-in zoom-in-95 duration-500">
                                <ShieldCheck className="w-16 h-16 mb-4 opacity-20" />
                                <h3 className="text-lg font-medium text-foreground mb-2">Select a Check to Inspect</h3>
                                <p className="text-sm max-w-sm">Choose a validation check from the list on the left to see the detailed extraction, scoring, and judge reasoning.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function RunResultsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground text-sm">Loading Runs...</div>}>
            <RunResultsContent />
        </Suspense>
    )
}
