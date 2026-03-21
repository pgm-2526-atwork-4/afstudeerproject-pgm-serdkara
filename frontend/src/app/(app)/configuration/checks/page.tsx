"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { ChevronDown, ChevronRight, Search, Upload } from "lucide-react"
import Link from "next/link"
import { InfoTooltip } from "@/components/ui/InfoTooltip"
import { Spinner } from "@/components/ui/Spinner"
import { apiUrl, authFetch } from "@/lib/api"
import { Dialog, Transition } from "@headlessui/react"
import { Fragment } from "react"

// Define the Check data structure
type Check = {
    id: string;
    name: string;
    prompt: string;
    category: string;
    usage: number;
    humanAgreement: number;
    lastModified: string;
    fewShot: string;
    judgeOverride: string;
}

type CheckApi = {
    id: string;
    name: string;
    prompt: string;
    category?: string;
    usage?: number;
    last_modified?: string | null;
    few_shot?: string;
    judge_override?: string;
}

type GoldenSetItem = {
    id: string;
    check_id: string;
    document_context: string;
    expected_outcome: string;
    expected_evidence: string;
}

type BenchmarkDetail = {
    golden_id: string;
    check_id: string;
    normalized_check_id?: string;
    expected_outcome: string;
    actual_verdict: string;
    actual_classification: string;
    reasoning: string;
    is_correct: boolean;
    error?: string;
}

type BenchmarkResult = {
    agreement_rate?: number;
    total?: number;
    correct?: number;
    details?: BenchmarkDetail[];
    per_check?: Record<string, { agreement_rate?: number }>;
    error?: string;
}

const normalizeCheckId = (rawId: string | null | undefined): string => {
    const value = (rawId || "").trim()
    if (!value) return ""

    const withoutPrefix = value.toUpperCase().startsWith("TEST_") ? value.slice(5) : value
    if (/^\d+(?:_\d+)+$/.test(withoutPrefix)) {
        return withoutPrefix.replaceAll("_", ".")
    }
    return withoutPrefix
}

export default function ChecksPage() {
    const [checks, setChecks] = useState<Check[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
    const [selectedCheckId, setSelectedCheckId] = useState<string | null>("9.1.1") // "new" for adding

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 3

    // Form toggle states
    const [showFewShot, setShowFewShot] = useState(false)
    const [showJudgeOverride, setShowJudgeOverride] = useState(false)

    const applyHumanAgreement = (baseChecks: Check[], perCheck: Record<string, { agreement_rate?: number }>) => {
        return baseChecks.map((check) => {
            const agreement = perCheck?.[check.id]?.agreement_rate
            return {
                ...check,
                humanAgreement: typeof agreement === "number" ? Math.round(agreement) : check.humanAgreement,
            }
        })
    }

    // Fetch checks from backend on mount
    useEffect(() => {
        const fetchChecks = async () => {
            try {
                const [checksRes, benchmarkRes] = await Promise.all([
                    authFetch('/api/checks'),
                    authFetch('/api/golden-set/benchmark/latest'),
                ])

                if (checksRes.ok) {
                    const data: CheckApi[] = await checksRes.json()
                    const formattedBase: Check[] = data.map((c) => ({
                        id: c.id,
                        name: c.name,
                        prompt: c.prompt,
                        category: c.category || "Uncategorized",
                        usage: c.usage || 0,
                        humanAgreement: 0,
                        lastModified: c.last_modified || "-",
                        fewShot: c.few_shot || "",
                        judgeOverride: c.judge_override || ""
                    }))
                    let formatted = formattedBase
                    if (benchmarkRes.ok) {
                        const benchmarkData = await benchmarkRes.json()
                        const perCheck = benchmarkData?.latest?.per_check || {}
                        formatted = applyHumanAgreement(formattedBase, perCheck)
                    }
                    setChecks(formatted)
                    if (formatted.length > 0) {
                        setSelectedCheckId(formatted[0].id)
                        setExpandedCategories({ [formatted[0].category]: true })
                    }
                }
            } catch (err) {
                console.error("Failed to fetch checks", err)
            }
        }
        fetchChecks()
    }, [])
    const [showGroundTruth, setShowGroundTruth] = useState(false)

    // Golden Set states
    const [goldenSets, setGoldenSets] = useState<GoldenSetItem[]>([]);
    const [isAddingGolden, setIsAddingGolden] = useState(false);
    const [newGolden, setNewGolden] = useState({ document_context: "", expected_outcome: "Pass", expected_evidence: "" });
    const [isBenchmarking, setIsBenchmarking] = useState(false);
    const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogTitle, setDialogTitle] = useState("Notice");
    const [dialogMessage, setDialogMessage] = useState("");
    const [dialogConfirmText, setDialogConfirmText] = useState("OK");
    const [dialogCancelText, setDialogCancelText] = useState<string | null>(null);
    const [dialogOnConfirm, setDialogOnConfirm] = useState<(() => void) | null>(null);

    const fetchJsonWithRetry = async (
        path: string,
        init?: RequestInit,
        retries = 1,
        timeoutMs = 45000
    ) => {
        let attempt = 0
        while (true) {
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), timeoutMs)
            try {
                const res = await authFetch(path, { ...(init || {}), signal: controller.signal })
                clearTimeout(timer)

                let data: unknown = null
                try {
                    data = await res.json()
                } catch {
                    data = null
                }

                if (!res.ok) {
                    const errorMsg = typeof data === 'object' && data !== null && 'error' in data
                        ? String((data as { error?: string }).error || `Request failed (${res.status})`)
                        : `Request failed (${res.status})`
                    throw new Error(errorMsg)
                }

                return data
            } catch (err: unknown) {
                clearTimeout(timer)
                const isAbort = err instanceof DOMException && err.name === 'AbortError'
                const isNetwork = err instanceof TypeError || isAbort
                if (attempt < retries && isNetwork) {
                    attempt += 1
                    await new Promise(resolve => setTimeout(resolve, 500 * attempt))
                    continue
                }
                throw err
            }
        }
    }

    const openNoticeDialog = (title: string, message: string) => {
        setDialogTitle(title);
        setDialogMessage(message);
        setDialogConfirmText("OK");
        setDialogCancelText(null);
        setDialogOnConfirm(null);
        setDialogOpen(true);
    };

    const openConfirmDialog = (title: string, message: string, onConfirm: () => void) => {
        setDialogTitle(title);
        setDialogMessage(message);
        setDialogConfirmText("Confirm");
        setDialogCancelText("Cancel");
        setDialogOnConfirm(() => onConfirm);
        setDialogOpen(true);
    };

    const handleDialogConfirm = () => {
        const confirmAction = dialogOnConfirm;
        setDialogOpen(false);
        setDialogOnConfirm(null);
        if (confirmAction) {
            confirmAction();
        }
    };

    useEffect(() => {
        authFetch('/api/golden-set')
            .then(res => res.json())
            .then((data: GoldenSetItem[]) => setGoldenSets(data))
            .catch(console.error);
    }, []);

    const handleSaveGolden = async () => {
        if (!newGolden.document_context || !newGolden.expected_evidence || !selectedCheckId) return;
        const res = await authFetch('/api/golden-set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                check_id: selectedCheckId,
                document_context: newGolden.document_context,
                expected_outcome: newGolden.expected_outcome,
                expected_evidence: newGolden.expected_evidence
            })
        });
        if (res.ok) {
            const data = await res.json();
            setGoldenSets([...goldenSets, { ...newGolden, id: data.id, check_id: selectedCheckId }]);
            setIsAddingGolden(false);
            setNewGolden({ document_context: "", expected_outcome: "Pass", expected_evidence: "" });
        }
    };

    const handleDeleteGolden = async (id: string) => {
        openConfirmDialog(
            "Delete Baseline",
            "Are you sure you want to delete this baseline? This action cannot be undone.",
            async () => {
                const res = await fetch(apiUrl(`/api/golden-set/${id}`), { method: 'DELETE' });
                
                if (res.ok) {
                    setGoldenSets(goldenSets.filter(g => g.id !== id));
                } else {
                    openNoticeDialog("Delete Failed", "Failed to delete baseline.");
                }
            }
        );
    };

    const handleRunBenchmark = async () => {
        setIsBenchmarking(true);
        setBenchmarkResult(null);
        try {
            const data = await fetchJsonWithRetry('/api/golden-set/benchmark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selected_check_id: selectedCheckId })
            }, 1, 60000) as BenchmarkResult

            setBenchmarkResult(data);
            setChecks((prev) => applyHumanAgreement(prev, data?.per_check || {}));
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown network error'
            setBenchmarkResult({ error: message })
            openNoticeDialog('Benchmark Failed', `Could not run benchmark: ${message}`)
            console.warn('Benchmark request failed', e)
        }
        finally { setIsBenchmarking(false); }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            let json: unknown
            try {
                json = JSON.parse(e.target?.result as string)
                if (!Array.isArray(json)) {
                    throw new Error("JSON must be an array of ground truth baselines.")
                }
            } catch (err: unknown) {
                console.error(err)
                const message = err instanceof Error ? err.message : "Parse error"
                openNoticeDialog("Invalid JSON", "Invalid JSON file: " + message)
                return
            }

            try {
                const res = await authFetch('/api/golden-set/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(json)
                })

                if (res.ok) {
                    openNoticeDialog("Upload Complete", "Ground truth baselines uploaded successfully.")
                    const refreshRes = await authFetch('/api/golden-set')
                    if (refreshRes.ok) {
                        const refreshData = await refreshRes.json()
                        setGoldenSets(refreshData)
                    }
                } else {
                    const errData = await res.json().catch(() => ({}))
                    openNoticeDialog("Upload Failed", `Failed to upload: ${errData.error || `HTTP ${res.status}`}`)
                }
            } catch (err: unknown) {
                console.error(err)
                const message = err instanceof Error ? err.message : "Network error"
                openNoticeDialog("Upload Failed", `Failed to upload baselines: ${message}`)
            }
        }
        reader.readAsText(file);

        // Reset file input value so same file can be selected again
        event.target.value = '';
    };

    const handleLibraryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await authFetch('/api/checks/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const uploadData = await res.json();
                const loadedCount = uploadData.total_checks ?? 0;
                const categoryCount = uploadData.categories_count ?? 0;
                const structureNote = uploadData.warning ? `\n\nNote: ${uploadData.warning}` : "";
                openNoticeDialog(
                    "Checks Library Uploaded",
                    `Loaded ${loadedCount} checks across ${categoryCount} categories.${structureNote}`
                );
                // Refresh checks by recalling the same fetch logic used on mount
                const refreshRes = await authFetch('/api/checks');
                if (refreshRes.ok) {
                    const data: CheckApi[] = await refreshRes.json();
                    const latestBenchRes = await authFetch('/api/golden-set/benchmark/latest');
                    const latestBenchData = latestBenchRes.ok ? await latestBenchRes.json() : {};
                    const perCheck = latestBenchData?.latest?.per_check || {};

                    const formattedBase: Check[] = data.map((c) => ({
                        id: c.id,
                        name: c.name,
                        prompt: c.prompt,
                        category: c.category || "Uncategorized",
                        usage: c.usage || 0,
                        humanAgreement: 0,
                        lastModified: c.last_modified || "-",
                        fewShot: c.few_shot || "",
                        judgeOverride: c.judge_override || ""
                    }));
                    const formatted = applyHumanAgreement(formattedBase, perCheck)
                    setChecks(formatted);
                    if (formatted.length > 0) {
                        setSelectedCheckId(formatted[0].id);
                        setExpandedCategories({ [formatted[0].category]: true });
                    } else {
                        setSelectedCheckId(null);
                        setExpandedCategories({});
                    }
                }
            } else {
                const errData = await res.json();
                openNoticeDialog("Upload Failed", `Failed to upload: ${errData.error || 'Unknown error'}`);
            }
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : "Unknown error";
            openNoticeDialog("Upload Failed", "Upload failed: " + message);
        }

        event.target.value = '';
    };

    const normalizedSelectedCheckId = normalizeCheckId(selectedCheckId)
    const currentCheckGoldenSets = goldenSets.filter(g => normalizeCheckId(g.check_id) === normalizedSelectedCheckId);
    const benchmarkDetailsForSelectedCheck = useMemo(() => {
        if (!benchmarkResult?.details) return [];
        return benchmarkResult.details.filter((detail) => {
            const detailId = normalizeCheckId(detail.normalized_check_id || detail.check_id)
            return detailId === normalizedSelectedCheckId
        })
    }, [benchmarkResult, normalizedSelectedCheckId])

    // Derived filtering & grouping
    const filteredChecks = useMemo(() => {
        if (!searchQuery) return checks;
        return checks.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [checks, searchQuery]);

    const categories = useMemo(() => {
        const catMap = new Map<string, Check[]>();
        filteredChecks.forEach(c => {
            if (!catMap.has(c.category)) catMap.set(c.category, []);
            catMap.get(c.category)?.push(c);
        })
        return Array.from(catMap.entries());
    }, [filteredChecks])

    const totalPages = Math.ceil(categories.length / ITEMS_PER_PAGE) || 1;
    const paginatedCategories = categories.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))
    }

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value)
        setCurrentPage(1)
        if (e.target.value) {
            const allExpanded: Record<string, boolean> = {};
            categories.forEach(([cat]) => allExpanded[cat] = true);
            setExpandedCategories(allExpanded);
        }
    }

    const handleNewCheckClick = () => {
        setSelectedCheckId("new")
        setShowFewShot(false)
        setShowJudgeOverride(false)
        setShowGroundTruth(false)
    }

    // Selected check logic
    const selectedCheck = selectedCheckId === "new"
        ? null
        : checks.find(c => c.id === selectedCheckId) || null;

    const [formData, setFormData] = useState<Partial<Check>>({})

    useEffect(() => {
        if (selectedCheckId === "new") {
            setFormData({
                category: "13.1 Example Category",
                usage: 0,
                humanAgreement: 0,
                lastModified: new Date().toISOString().split('T')[0],
                id: "",
                name: "",
                prompt: "",
                fewShot: "",
                judgeOverride: ""
            })
        } else if (selectedCheck) {
            setFormData(selectedCheck)
        }
    }, [selectedCheckId, selectedCheck])

    const handleSave = async () => {
        if (!formData.id || !formData.name) {
            openNoticeDialog("Validation Error", "ID and Name are required.");
            return;
        }

        if (selectedCheckId === "new") {
            if (checks.some(c => c.id === formData.id)) {
                openNoticeDialog("Validation Error", "Check ID already exists.");
                return;
            }
            try {
                const res = await fetch(apiUrl('/api/checks'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: formData.id,
                        name: formData.name,
                        prompt: formData.prompt || '',
                        category: formData.category || 'Uncategorized',
                        few_shot: formData.fewShot || '',
                        judge_override: formData.judgeOverride || '',
                    })
                })
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}))
                    openNoticeDialog("Save Failed", errData.error || "Failed to create check.")
                    return
                }

                const newCheck = {
                    ...formData,
                    usage: 0,
                    humanAgreement: 0,
                    lastModified: new Date().toISOString().split('T')[0]
                } as Check;
                setChecks(prev => [...prev, newCheck]);
                setSelectedCheckId(newCheck.id);
                setExpandedCategories(prev => ({ ...prev, [newCheck.category]: true }))
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Unknown error"
                openNoticeDialog("Save Failed", message)
            }
        } else {
            try {
                const res = await fetch(apiUrl(`/api/checks/${selectedCheckId}`), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: formData.name,
                        prompt: formData.prompt || '',
                        category: formData.category || 'Uncategorized',
                        few_shot: formData.fewShot || '',
                        judge_override: formData.judgeOverride || '',
                    })
                })
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}))
                    openNoticeDialog("Save Failed", errData.error || "Failed to update check.")
                    return
                }
                setChecks(prev => prev.map(c => c.id === selectedCheckId ? { ...c, ...formData } as Check : c));
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Unknown error"
                openNoticeDialog("Save Failed", message)
            }
        }
    }

    const handleDelete = () => {
        if (selectedCheckId === "new" || !selectedCheckId) return;
        openConfirmDialog(
            "Delete Check",
            "Are you sure you want to delete this check? This action cannot be undone.",
            async () => {
                const res = await fetch(apiUrl(`/api/checks/${selectedCheckId}`), { method: 'DELETE' });
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}))
                    openNoticeDialog("Delete Failed", errData.error || "Failed to delete check.")
                    return
                }
                setChecks(prev => prev.filter(c => c.id !== selectedCheckId));
                setSelectedCheckId(null);
            }
        );
    }

    return (
        <>
        <div className="space-y-8">
            <div>
                <h1 className="text-xl font-medium tracking-tight mb-6">Configuration</h1>

                {/* Stepper Wizard Mock */}
                <Card className="p-8">
                    <div className="flex items-start justify-between max-w-3xl mx-auto relative px-4 lg:px-0">
                        {/* Connecting lines background */}
                        <div className="absolute top-5 left-10 right-10 lg:left-14 lg:right-14 h-0.5 bg-border z-0"></div>
                        {/* Progress line (Step 1 -> 0 width) */}
                        <div className="absolute top-5 left-10 lg:left-14 w-0 h-0.5 bg-primary z-0 transition-all duration-500"></div>

                        {/* Step 1 */}
                        <div className="relative z-10 flex flex-col items-center gap-2 lg:gap-3 flex-1">
                            <Link href="/configuration/checks" className="w-10 h-10 rounded-full shrink-0 bg-primary text-white flex items-center justify-center font-medium shadow-[0_0_15px_rgba(109,85,255,0.4)] cursor-pointer hover:scale-105 transition-transform">1</Link>
                            <div className="text-center h-auto min-h-12 px-1">
                                <div className="text-xs lg:text-sm font-semibold text-foreground">Checks Library</div>
                                <div className="hidden lg:block text-xs text-muted-foreground mt-0.5">Define security requirements</div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative z-10 flex flex-col items-center gap-2 lg:gap-3 flex-1">
                            <Link href="/configuration/judge" className="w-10 h-10 rounded-full shrink-0 bg-sidebar border-2 border-border text-muted-foreground flex items-center justify-center font-medium cursor-pointer hover:border-primary/50 hover:text-foreground transition-colors">2</Link>
                            <div className="text-center h-auto min-h-12 px-1">
                                <div className="text-xs lg:text-sm font-medium text-muted-foreground">Judge Configuration</div>
                                <div className="hidden lg:block text-xs text-muted-foreground mt-0.5">Configure evaluation rubric</div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative z-10 flex flex-col items-center gap-2 lg:gap-3 flex-1">
                            <Link href="/configuration/settings" className="w-10 h-10 rounded-full shrink-0 bg-sidebar border-2 border-border text-muted-foreground flex items-center justify-center font-medium cursor-pointer hover:border-primary/50 hover:text-foreground transition-colors">3</Link>
                            <div className="text-center h-auto min-h-12 px-1">
                                <div className="text-xs lg:text-sm font-medium text-muted-foreground">LLM Settings</div>
                                <div className="hidden lg:block text-xs text-muted-foreground mt-0.5">Choose models & parameters</div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <div>
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-medium tracking-tight flex items-center mb-1">
                            Checks Library
                            <InfoTooltip title="Checks Library">
                                These constraints define exactly what needs to be verified in a policy document. They act as the &quot;Systemic Prompt&quot; baseline, guiding the LLM later when it evaluates a document.
                            </InfoTooltip>
                        </h2>
                        <p className="text-sm text-muted-foreground">Define <span className="font-semibold text-foreground">what</span> security requirements you want to check in your policy documents.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        {/* 1. Upload Library */}
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleLibraryUpload}
                            className="hidden"
                            id="library-upload"
                        />
                        <label htmlFor="library-upload">
                            <Button variant="default" className="flex items-center gap-2 cursor-pointer w-full bg-primary hover:bg-primary/90 text-white shadow-sm" asChild>
                                <span>
                                    <Upload className="w-4 h-4" />
                                    Upload Checks Library
                                </span>
                            </Button>
                        </label>

                        {/* 2. Upload Ground Truth Baselines */}
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="golden-upload"
                        />
                        <label htmlFor="golden-upload">
                            <Button variant="outline" className="flex items-center justify-center gap-2 cursor-pointer w-full border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 dark:text-amber-500" asChild>
                                <span>
                                    <Upload className="w-4 h-4" />
                                    Upload Ground Truth Baselines
                                </span>
                            </Button>
                        </label>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* Left Sidebar Menu */}
                    <div className="w-full lg:w-72 shrink-0 space-y-4" data-tutorial-step="checks-library">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search checks..."
                                value={searchQuery}
                                onChange={handleSearch}
                                className="w-full bg-sidebar border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>

                        <div className="text-xs text-muted-foreground">
                            Loaded <span className="font-semibold text-foreground">{checks.length}</span> checks across <span className="font-semibold text-foreground">{categories.length}</span> categories.
                        </div>

                        <div className="space-y-2">
                            {paginatedCategories.length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-4 bg-sidebar border border-border rounded-lg">No checks found.</div>
                            )}
                            {paginatedCategories.map(([category, catChecks]) => (
                                <div key={category} className="bg-sidebar border border-border rounded-lg overflow-hidden">
                                    <div
                                        className="flex items-center gap-2 px-3 py-2.5 bg-white/2 cursor-pointer hover:bg-white/4 transition-colors"
                                        onClick={() => toggleCategory(category)}
                                    >
                                        {expandedCategories[category] ? <ChevronDown className="h-4 w-4 opacity-70" /> : <ChevronRight className="h-4 w-4 opacity-70" />}
                                        <span className="text-sm font-medium">{category}</span>
                                    </div>

                                    {expandedCategories[category] && (
                                        <div className="flex flex-col">
                                            {catChecks.map(check => (
                                                <div
                                                    key={check.id}
                                                    onClick={() => setSelectedCheckId(check.id)}
                                                    className={`px-3 py-2.5 cursor-pointer border-b last:border-b-0 border-border ${selectedCheckId === check.id ? 'bg-primary/10 border-l-2 border-l-primary border-y border-y-primary/20' : 'hover:bg-white/2'}`}
                                                >
                                                    <span className={`text-sm pl-6 ${selectedCheckId === check.id ? 'font-medium text-primary' : 'text-muted-foreground'}`}>{check.id} - {check.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-sidebar border-border px-2 sm:px-4"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >← <span className="hidden sm:inline ml-1">Prev</span></Button>
                            <span className="text-xs text-muted-foreground text-center">Page {currentPage} of {totalPages}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-sidebar border-border px-2 sm:px-4"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            ><span className="hidden sm:inline mr-1">Next</span> →</Button>
                        </div>

                        <Button
                            variant="outline"
                            onClick={handleNewCheckClick}
                            className="w-full bg-sidebar border-border border-dashed text-primary hover:text-primary/80"
                        >
                            + New Check
                        </Button>
                    </div>

                    {/* Right Content Area */}
                    <Card className="flex-1 min-w-0 w-full border-primary/30 shadow-[0_4px_20px_rgba(109,85,255,0.05)] overflow-hidden">
                        {(selectedCheckId || selectedCheckId === "new") && (
                            <>
                                <div className="bg-primary/5 px-6 py-4 border-b border-primary/20 flex items-center justify-between">
                                    <h3 className="font-medium text-foreground">
                                        {selectedCheckId === "new" ? "Create New Check" : `Check Details: ${formData.id || ''}`}
                                    </h3>
                                    {selectedCheckId === "new" && (
                                        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">Draft</span>
                                    )}
                                </div>

                                <CardContent className="p-6 space-y-6">
                                    {selectedCheckId !== "new" && (
                                        <div className="bg-sidebar border border-border rounded-lg p-3 text-sm flex flex-col lg:flex-row lg:items-center lg:flex-wrap gap-2 text-muted-foreground lg:divide-x divide-border">
                                            <div className="py-1 lg:py-0 lg:pr-2 whitespace-nowrap">Usage: <span className="text-foreground">{formData.usage} runs</span></div>
                                            <div className="py-1 lg:py-0 lg:px-2 whitespace-nowrap">Human Agreement: <span className="text-emerald-500 font-medium">{formData.humanAgreement}%</span></div>
                                            <div className="py-1 lg:py-0 lg:pl-2 whitespace-nowrap">Last modified: {formData.lastModified}</div>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-foreground">Category</label>
                                            <input
                                                type="text"
                                                value={formData.category || ''}
                                                onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                                                className="w-full bg-sidebar border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                            <div className="space-y-1.5 md:col-span-1">
                                                <label className="text-sm font-medium text-foreground">Check ID</label>
                                                <input
                                                    type="text"
                                                    value={formData.id || ''}
                                                    onChange={e => setFormData(p => ({ ...p, id: e.target.value }))}
                                                    disabled={selectedCheckId !== "new"}
                                                    className="w-full bg-sidebar border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                                                />
                                            </div>
                                            <div className="space-y-1.5 md:col-span-3">
                                                <label className="text-sm font-medium text-foreground">Check Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.name || ''}
                                                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                                    className="w-full bg-sidebar border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5" data-tutorial-step="extraction-prompt">
                                            <label className="text-sm font-medium text-foreground flex items-center">
                                                Extraction Prompt
                                                <InfoTooltip title="Extraction Prompt">
                                                    This tells the first LLM exactly what snippet of text to pull from the uploaded document before the Judge evaluates it. Keep it highly specific to the constraint category.
                                                </InfoTooltip>
                                            </label>
                                            <textarea
                                                value={formData.prompt || ''}
                                                onChange={e => setFormData(p => ({ ...p, prompt: e.target.value }))}
                                                className="w-full bg-sidebar border border-border rounded-lg px-3 py-3 text-sm min-h-25 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary text-muted-foreground"
                                            />
                                        </div>

                                        <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg overflow-hidden transition-all duration-200 mt-2 mb-6" data-tutorial-step="golden-baselines">
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => setShowGroundTruth(!showGroundTruth)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowGroundTruth(!showGroundTruth); } }}
                                                className="w-full hover:bg-amber-500/10 transition-colors p-3 flex items-center justify-between cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-500">
                                                    <span className="text-amber-500">★</span>
                                                    Ground Truth Baselines
                                                    <InfoTooltip title="Ground Truth Baselines">
                                                        Define the expected human verdict for specific documents against this explicit check. By providing a baseline, the system can measure how closely the LLM Judge agrees with human experts over time.
                                                    </InfoTooltip>
                                                </div>
                                                {showGroundTruth ? <ChevronDown className="h-4 w-4 text-amber-600/70 dark:text-amber-500/70" /> : <ChevronRight className="h-4 w-4 text-amber-600/70 dark:text-amber-500/70" />}
                                            </div>

                                            {showGroundTruth && (
                                                <div className="p-5 border-t border-amber-500/20 bg-background/80 animate-in fade-in slide-in-from-top-2 shadow-inner">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <p className="text-sm text-muted-foreground max-w-2xl">
                                                            Establish the ground truth baseline for <strong className="text-foreground">{formData.id || 'this check'}</strong>. Define the expected human outcome for specific document contexts so the Judge LLM&apos;s accuracy can be measured against it.
                                                        </p>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className="bg-amber-600 hover:bg-amber-700 text-white"
                                                            onClick={handleRunBenchmark}
                                                            disabled={isBenchmarking}
                                                        >
                                                            {isBenchmarking ? (
                                                                <span className="inline-flex items-center gap-2">
                                                                    <Spinner size="sm" className="text-white" />
                                                                    Running Benchmark...
                                                                </span>
                                                            ) : "Run Benchmark"}
                                                        </Button>
                                                    </div>

                                                    <div className="mb-3 text-xs text-muted-foreground">
                                                        Showing benchmark details for selected check <span className="font-semibold text-foreground">{normalizedSelectedCheckId || "N/A"}</span> only. Global benchmark still runs across all ground truth baselines.
                                                    </div>

                                                    {benchmarkResult && (
                                                        <div className="mb-4 p-4 rounded-lg bg-sidebar border border-border">
                                                            {benchmarkResult.error ? (
                                                                <div className="text-rose-500 text-sm font-medium">{benchmarkResult.error}</div>
                                                            ) : (
                                                                <>
                                                                    <h4 className="font-medium text-foreground mb-2 flex items-center justify-between">
                                                                        Benchmark Results:
                                                                    </h4>
                                                                    <div className="space-y-2 mt-3">
                                                                        {benchmarkDetailsForSelectedCheck.map((detail, i: number) => (
                                                                            <div key={i} className={`p-3 rounded text-sm border ${detail.is_correct ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                                                                                <div className="flex justify-between mb-1">
                                                                                    <span className="font-semibold text-foreground">Check {detail.check_id}</span>
                                                                                    <span>Expected: <span className="font-medium">{detail.expected_outcome}</span> | LLM: <span className="font-medium">{detail.actual_verdict}</span> ({detail.actual_classification})</span>
                                                                                </div>
                                                                                <p className="text-muted-foreground text-xs mt-1"><span className="font-medium text-foreground">Reasoning:</span> {detail.reasoning}</p>
                                                                                {detail.error && <p className="text-rose-500 text-xs mt-1">Error: {detail.error}</p>}
                                                                            </div>
                                                                        ))}
                                                                        {benchmarkDetailsForSelectedCheck.length === 0 && (
                                                                            <div className="text-xs text-muted-foreground">No benchmark details available for this selected check.</div>
                                                                        )}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="border border-border rounded-lg overflow-x-auto mb-4">
                                                        <table className="w-full text-sm text-left min-w-150">
                                                            <thead className="bg-sidebar border-b border-border text-muted-foreground">
                                                                <tr>
                                                                    <th className="px-4 py-3 font-medium">Context / Document Quote</th>
                                                                    <th className="px-4 py-3 font-medium">Expected Result</th>
                                                                    <th className="px-4 py-3 font-medium">Expected Evidence</th>
                                                                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border text-xs">
                                                                {currentCheckGoldenSets.length === 0 && (
                                                                    <tr>
                                                                        <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No ground truth baselines defined for this check yet.</td>
                                                                    </tr>
                                                                )}
                                                                {currentCheckGoldenSets.map(golden => (
                                                                    <tr key={golden.id} className="hover:bg-sidebar/50 transition-colors">
                                                                        <td className="px-4 py-3 font-medium text-foreground max-w-50 truncate" title={golden.document_context}>{golden.document_context}</td>
                                                                        <td className="px-4 py-3">
                                                                            <span className={`font-semibold px-2 py-0.5 rounded ${golden.expected_outcome.toLowerCase() === 'pass' ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                                                                                {golden.expected_outcome}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-muted-foreground truncate max-w-50" title={golden.expected_evidence}>{golden.expected_evidence}</td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <Button variant="ghost" size="sm" className="h-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10" onClick={() => handleDeleteGolden(golden.id)}>Delete</Button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    {isAddingGolden ? (
                                                        <div className="bg-sidebar p-4 rounded-lg border border-border space-y-3">
                                                            <div>
                                                                <label className="text-xs font-medium text-muted-foreground">Document Context (Snippet)</label>
                                                                <textarea
                                                                    className="w-full bg-background border border-border rounded p-2 text-sm mt-1"
                                                                    rows={3}
                                                                    value={newGolden.document_context}
                                                                    onChange={e => setNewGolden({ ...newGolden, document_context: e.target.value })}
                                                                    placeholder="e.g. 'All employees must use 2FA...'"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="text-xs font-medium text-muted-foreground">Expected Outcome</label>
                                                                    <select
                                                                        className="w-full bg-background border border-border rounded p-2 text-sm mt-1 focus:outline-none"
                                                                        value={newGolden.expected_outcome}
                                                                        onChange={e => setNewGolden({ ...newGolden, expected_outcome: e.target.value })}
                                                                    >
                                                                        <option value="Pass">Pass</option>
                                                                        <option value="Fail">Fail</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs font-medium text-muted-foreground">Expected Evidence</label>
                                                                    <input
                                                                        type="text"
                                                                        className="w-full bg-background border border-border rounded p-2 text-sm mt-1"
                                                                        value={newGolden.expected_evidence}
                                                                        onChange={e => setNewGolden({ ...newGolden, expected_evidence: e.target.value })}
                                                                        placeholder="e.g. 'use 2FA'"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 justify-end pt-2">
                                                                <Button variant="ghost" size="sm" onClick={() => setIsAddingGolden(false)}>Cancel</Button>
                                                                <Button variant="default" size="sm" onClick={handleSaveGolden} className="bg-amber-600 hover:bg-amber-700 text-white">Save Baseline</Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full bg-sidebar border-dashed border-amber-500/50 text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-500/10"
                                                            onClick={() => setIsAddingGolden(true)}
                                                        >
                                                            + Add Document Baseline
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="border border-border/50 rounded-lg overflow-hidden transition-all duration-200">
                                            <button
                                                onClick={() => setShowFewShot(!showFewShot)}
                                                className="w-full bg-primary/10 hover:bg-primary/15 transition-colors border border-primary/30 rounded-lg p-3 flex items-center justify-between cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                                    Few-Shot Examples (optional)
                                                </div>
                                                {showFewShot ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                            </button>

                                            {showFewShot && (
                                                <div className="p-5 space-y-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
                                                    <p className="text-xs text-muted-foreground">Provide examples to guide the extraction model&apos;s behavior.</p>
                                                    <textarea
                                                        value={formData.fewShot || ''}
                                                        onChange={e => setFormData(p => ({ ...p, fewShot: e.target.value }))}
                                                        placeholder="Enter examples..."
                                                        className="w-full bg-sidebar border border-border/50 rounded-lg p-4 text-sm text-foreground min-h-25 focus:outline-none focus:border-primary/50 resize-none font-mono"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="border border-border/50 rounded-lg overflow-hidden transition-all duration-200">
                                            <button
                                                onClick={() => setShowJudgeOverride(!showJudgeOverride)}
                                                className="w-full bg-sidebar hover:bg-white/2 transition-colors border border-border rounded-lg p-3 flex items-center justify-between cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2 text-sm font-medium">
                                                    Judge Rubric Override (optional)
                                                </div>
                                                {showJudgeOverride ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                            </button>

                                            {showJudgeOverride && (
                                                <div className="p-5 space-y-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
                                                    <p className="text-xs text-muted-foreground">Override the default judge rubric for this specific check.</p>
                                                    <textarea
                                                        value={formData.judgeOverride || ''}
                                                        onChange={e => setFormData(p => ({ ...p, judgeOverride: e.target.value }))}
                                                        placeholder="Enter custom rubric rules..."
                                                        className="w-full bg-sidebar border border-border/50 rounded-lg p-4 text-sm text-foreground min-h-25 focus:outline-none focus:border-primary/50 resize-none font-mono"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-border/50">
                                        <Button onClick={handleSave} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-medium">Save Check</Button>
                                        {selectedCheckId !== "new" && (
                                            <>
                                                <Button onClick={handleDelete} variant="outline" className="w-full sm:w-auto bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20">Delete Check</Button>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </>
                        )}
                        {!selectedCheckId && selectedCheckId !== "new" && (
                            <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-3">
                                <div className="w-12 h-12 rounded-full bg-sidebar border border-border flex items-center justify-center text-muted-foreground">
                                    <Search className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-foreground">No Check Selected</h4>
                                    <p className="text-sm text-muted-foreground mt-1">Select a check from the library or create a new one.</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-8">
                    <Button asChild className="bg-primary w-full sm:w-auto text-white hover:bg-primary/90 transition-colors">
                        <Link href="/configuration/judge">Next: Judge Config →</Link>
                    </Button>
                </div>
            </div>
        </div>

        <Transition appear show={dialogOpen} as={Fragment}>
            <Dialog as="div" className="relative z-110" onClose={() => setDialogOpen(false)}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-sidebar border border-border p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-foreground">
                                    {dialogTitle}
                                </Dialog.Title>
                                <div className="mt-3 text-sm text-muted-foreground whitespace-pre-line">
                                    {dialogMessage}
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    {dialogCancelText && (
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-sidebar transition-colors cursor-pointer"
                                            onClick={() => setDialogOpen(false)}
                                        >
                                            {dialogCancelText}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-lg border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors cursor-pointer"
                                        onClick={handleDialogConfirm}
                                    >
                                        {dialogConfirmText}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
        </>
    )
}
