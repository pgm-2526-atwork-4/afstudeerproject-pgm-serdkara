"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { ChevronDown, ChevronRight, Search, Upload } from "lucide-react"
import Link from "next/link"
import { InfoTooltip } from "@/components/ui/InfoTooltip"

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

const initialChecks: Check[] = [
    {
        id: "9.1.1",
        name: "Incident Response Plan Exists",
        prompt: "Extract from the document whether there is a documented incident response plan. Include specific details about roles, responsibilities, escalation procedures, and contact information.",
        category: "9.1 Incident Management",
        usage: 12,
        humanAgreement: 89,
        lastModified: "2026-02-10",
        fewShot: "",
        judgeOverride: ""
    },
    {
        id: "9.1.2",
        name: "Incident Response Testing",
        prompt: "Extract evidence of incident response plan testing...",
        category: "9.1 Incident Management",
        usage: 5,
        humanAgreement: 95,
        lastModified: "2026-02-15",
        fewShot: "",
        judgeOverride: ""
    },
    {
        id: "10.1.1",
        name: "Access Control Policy",
        prompt: "Check if an access control policy exists...",
        category: "10.1 Access Control",
        usage: 8,
        humanAgreement: 88,
        lastModified: "2026-01-20",
        fewShot: "",
        judgeOverride: ""
    },
    {
        id: "11.1.1",
        name: "Firewall Rules",
        prompt: "Verify firewall rules are reviewed annually...",
        category: "11.1 Network Security",
        usage: 20,
        humanAgreement: 92,
        lastModified: "2026-02-01",
        fewShot: "",
        judgeOverride: ""
    },
    {
        id: "12.1.1",
        name: "Data Encryption at Rest",
        prompt: "Verify all sensitive data is encrypted at rest...",
        category: "12.1 Cryptography",
        usage: 2,
        humanAgreement: 100,
        lastModified: "2026-02-20",
        fewShot: "",
        judgeOverride: ""
    }
]

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

    // Fetch checks from backend on mount
    useEffect(() => {
        const fetchChecks = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/checks')
                if (res.ok) {
                    const data = await res.json()
                    const formatted = data.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        prompt: c.prompt,
                        category: c.category || "Uncategorized",
                        usage: 0, // In real app, this would come from analytics
                        humanAgreement: 0, // In real app, this would come from evaluations
                        lastModified: new Date().toISOString().split('T')[0],
                        fewShot: "",
                        judgeOverride: ""
                    }))
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
    const [goldenSets, setGoldenSets] = useState<any[]>([]);
    const [isAddingGolden, setIsAddingGolden] = useState(false);
    const [newGolden, setNewGolden] = useState({ document_context: "", expected_outcome: "Pass", expected_evidence: "" });
    const [isBenchmarking, setIsBenchmarking] = useState(false);
    const [benchmarkResult, setBenchmarkResult] = useState<any>(null);

    useEffect(() => {
        fetch('http://localhost:5000/api/golden-set')
            .then(res => res.json())
            .then(data => setGoldenSets(data))
            .catch(console.error);
    }, []);

    const handleSaveGolden = async () => {
        if (!newGolden.document_context || !newGolden.expected_evidence || !selectedCheckId) return;
        const res = await fetch('http://localhost:5000/api/golden-set', {
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
        if (!confirm("Delete this baseline?")) return;
        const res = await fetch(`http://localhost:5000/api/golden-set/${id}`, { method: 'DELETE' });
        if (res.ok) {
            setGoldenSets(goldenSets.filter(g => g.id !== id));
        }
    };

    const handleRunBenchmark = async () => {
        setIsBenchmarking(true);
        setBenchmarkResult(null);
        try {
            const res = await fetch('http://localhost:5000/api/golden-set/benchmark', { method: 'POST' });
            const data = await res.json();
            setBenchmarkResult(data);
        } catch (e) { console.error(e) }
        finally { setIsBenchmarking(false); }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                if (!Array.isArray(json)) {
                    throw new Error("JSON must be an array of golden baselines.");
                }

                const res = await fetch('http://localhost:5000/api/golden-set/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(json)
                });

                if (res.ok) {
                    alert("Golden baselines uploaded successfully!");
                    // Refresh goldens
                    const refreshRes = await fetch('http://localhost:5000/api/golden-set');
                    if (refreshRes.ok) {
                        const refreshData = await refreshRes.json();
                        setGoldenSets(refreshData);
                    }
                } else {
                    const errData = await res.json();
                    alert(`Failed to upload: ${errData.error || 'Unknown error'}`);
                }
            } catch (err: any) {
                console.error(err);
                alert("Invalid JSON file: " + (err.message || "Parse error"));
            }
        };
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
            const res = await fetch('http://localhost:5000/api/checks/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                alert("Checks library uploaded successfully!");
                // Refresh checks by recalling the same fetch logic used on mount
                const refreshRes = await fetch('http://localhost:5000/api/checks');
                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    const formatted = data.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        prompt: c.prompt,
                        category: c.category || "Uncategorized",
                        usage: 0,
                        humanAgreement: 0,
                        lastModified: new Date().toISOString().split('T')[0],
                        fewShot: "",
                        judgeOverride: ""
                    }));
                    setChecks(formatted);
                    if (formatted.length > 0) {
                        setSelectedCheckId(formatted[0].id);
                        setExpandedCategories({ [formatted[0].category]: true });
                    }
                }
            } else {
                const errData = await res.json();
                alert(`Failed to upload: ${errData.error || 'Unknown error'}`);
            }
        } catch (err: any) {
            console.error(err);
            alert("Upload failed: " + (err.message || "Unknown error"));
        }

        event.target.value = '';
    };

    const currentCheckGoldenSets = goldenSets.filter(g => g.check_id === selectedCheckId);

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
            // eslint-disable-next-line
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

    const handleSave = () => {
        if (!formData.id || !formData.name) return alert("ID and Name are required.");

        if (selectedCheckId === "new") {
            if (checks.some(c => c.id === formData.id)) {
                return alert("Check ID already exists.");
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
        } else {
            setChecks(prev => prev.map(c => c.id === selectedCheckId ? { ...c, ...formData } as Check : c));
        }
    }

    const handleDelete = () => {
        if (selectedCheckId === "new" || !selectedCheckId) return;
        if (confirm("Are you sure you want to delete this check?")) {
            setChecks(prev => prev.filter(c => c.id !== selectedCheckId));
            setSelectedCheckId(null);
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-xl font-medium tracking-tight mb-6">Configuration</h1>

                {/* Stepper Wizard Mock */}
                <Card className="p-8">
                    <div className="flex items-start justify-between max-w-3xl mx-auto relative px-4 lg:px-0">
                        {/* Connecting lines background */}
                        <div className="absolute top-5 left-10 right-10 lg:left-14 lg:right-14 h-[2px] bg-border z-0"></div>
                        {/* Progress line (Step 1 -> 0 width) */}
                        <div className="absolute top-5 left-10 lg:left-14 w-0 h-[2px] bg-primary z-0 transition-all duration-500"></div>

                        {/* Step 1 */}
                        <div className="relative z-10 flex flex-col items-center gap-2 lg:gap-3 flex-1">
                            <Link href="/configuration/checks" className="w-10 h-10 rounded-full shrink-0 bg-primary text-white flex items-center justify-center font-medium shadow-[0_0_15px_rgba(109,85,255,0.4)] cursor-pointer hover:scale-105 transition-transform">1</Link>
                            <div className="text-center h-auto min-h-[48px] px-1">
                                <div className="text-xs lg:text-sm font-semibold text-foreground">Checks Library</div>
                                <div className="hidden lg:block text-xs text-muted-foreground mt-0.5">Define security requirements</div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative z-10 flex flex-col items-center gap-2 lg:gap-3 flex-1">
                            <Link href="/configuration/judge" className="w-10 h-10 rounded-full shrink-0 bg-sidebar border-2 border-border text-muted-foreground flex items-center justify-center font-medium cursor-pointer hover:border-primary/50 hover:text-foreground transition-colors bg-background">2</Link>
                            <div className="text-center h-auto min-h-[48px] px-1">
                                <div className="text-xs lg:text-sm font-medium text-muted-foreground">Judge Configuration</div>
                                <div className="hidden lg:block text-xs text-muted-foreground mt-0.5">Configure evaluation rubric</div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative z-10 flex flex-col items-center gap-2 lg:gap-3 flex-1">
                            <Link href="/configuration/settings" className="w-10 h-10 rounded-full shrink-0 bg-sidebar border-2 border-border text-muted-foreground flex items-center justify-center font-medium cursor-pointer hover:border-primary/50 hover:text-foreground transition-colors bg-background">3</Link>
                            <div className="text-center h-auto min-h-[48px] px-1">
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

                        {/* 2. Upload Golden Baselines */}
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
                                    Upload Golden Baselines
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

                        <div className="space-y-2">
                            {paginatedCategories.length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-4 bg-sidebar border border-border rounded-lg">No checks found.</div>
                            )}
                            {paginatedCategories.map(([category, catChecks]) => (
                                <div key={category} className="bg-sidebar border border-border rounded-lg overflow-hidden">
                                    <div
                                        className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors"
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
                                                    className={`px-3 py-2.5 cursor-pointer border-b last:border-b-0 border-border ${selectedCheckId === check.id ? 'bg-primary/10 border-l-2 border-l-primary border-y border-y-primary/20 bg-white/[0.00]' : 'hover:bg-white/[0.02]'}`}
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
                                                className="w-full bg-sidebar border border-border rounded-lg px-3 py-3 text-sm min-h-[100px] font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary text-muted-foreground"
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
                                                    Golden Baselines (Human Ground Truth)
                                                    <InfoTooltip title="Golden Baselines">
                                                        Define the expected human verdict for specific documents against this explicit check. By providing a baseline, the system can measure how closely the LLM Judge agrees with human experts over time.
                                                    </InfoTooltip>
                                                </div>
                                                {showGroundTruth ? <ChevronDown className="h-4 w-4 text-amber-600/70 dark:text-amber-500/70" /> : <ChevronRight className="h-4 w-4 text-amber-600/70 dark:text-amber-500/70" />}
                                            </div>

                                            {showGroundTruth && (
                                                <div className="p-5 border-t border-amber-500/20 bg-background/80 animate-in fade-in slide-in-from-top-2 shadow-inner">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <p className="text-sm text-muted-foreground max-w-2xl">
                                                            Establish the benchmark for <strong className="text-foreground">{formData.id || 'this check'}</strong>. Define the expected human outcome for specific document contexts so the Judge LLM&apos;s accuracy can be measured against it.
                                                        </p>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className="bg-amber-600 hover:bg-amber-700 text-white"
                                                            onClick={handleRunBenchmark}
                                                            disabled={isBenchmarking}
                                                        >
                                                            {isBenchmarking ? "Running Benchmark..." : "Test AI Calibration"}
                                                        </Button>
                                                    </div>

                                                    {benchmarkResult && (
                                                        <div className="mb-4 p-4 rounded-lg bg-sidebar border border-border">
                                                            {benchmarkResult.error ? (
                                                                <div className="text-rose-500 text-sm font-medium">{benchmarkResult.error}</div>
                                                            ) : (
                                                                <>
                                                                    <h4 className="font-medium text-foreground mb-2 flex items-center justify-between">
                                                                        Benchmark Results:
                                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${benchmarkResult.agreement_rate >= 80 ? 'bg-emerald-500/20 text-emerald-600' : 'bg-rose-500/20 text-rose-600'}`}>
                                                                            {benchmarkResult.agreement_rate?.toFixed(1) || 0}% Agreement
                                                                        </span>
                                                                    </h4>
                                                                    <div className="space-y-2 mt-3">
                                                                        {benchmarkResult.details?.map((detail: any, i: number) => (
                                                                            <div key={i} className={`p-3 rounded text-sm border ${detail.is_correct ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                                                                                <div className="flex justify-between mb-1">
                                                                                    <span className="font-semibold text-foreground">Check {detail.check_id}</span>
                                                                                    <span>Expected: <span className="font-medium">{detail.expected_outcome}</span> | LLM: <span className="font-medium">{detail.actual_verdict}</span> ({detail.actual_classification})</span>
                                                                                </div>
                                                                                <p className="text-muted-foreground text-xs mt-1"><span className="font-medium text-foreground">Reasoning:</span> {detail.reasoning}</p>
                                                                                {detail.error && <p className="text-rose-500 text-xs mt-1">Error: {detail.error}</p>}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="border border-border rounded-lg overflow-x-auto mb-4">
                                                        <table className="w-full text-sm text-left min-w-[600px]">
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
                                                                        <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No baselines defined for this check yet.</td>
                                                                    </tr>
                                                                )}
                                                                {currentCheckGoldenSets.map(golden => (
                                                                    <tr key={golden.id} className="hover:bg-sidebar/50 transition-colors">
                                                                        <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate" title={golden.document_context}>{golden.document_context}</td>
                                                                        <td className="px-4 py-3">
                                                                            <span className={`font-semibold px-2 py-0.5 rounded ${golden.expected_outcome.toLowerCase() === 'pass' ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                                                                                {golden.expected_outcome}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]" title={golden.expected_evidence}>{golden.expected_evidence}</td>
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
                                                className="w-full bg-primary/10 hover:bg-primary/15 transition-colors border border-primary/30 rounded-lg p-3 flex items-center justify-between transition-colors cursor-pointer"
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
                                                        className="w-full bg-sidebar border border-border/50 rounded-lg p-4 text-sm text-foreground min-h-[100px] focus:outline-none focus:border-primary/50 resize-none font-mono"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="border border-border/50 rounded-lg overflow-hidden transition-all duration-200">
                                            <button
                                                onClick={() => setShowJudgeOverride(!showJudgeOverride)}
                                                className="w-full bg-sidebar hover:bg-white/[0.02] transition-colors border border-border rounded-lg p-3 flex items-center justify-between transition-colors cursor-pointer"
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
                                                        className="w-full bg-sidebar border border-border/50 rounded-lg p-4 text-sm text-foreground min-h-[100px] focus:outline-none focus:border-primary/50 resize-none font-mono"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-border/50">
                                        <Button onClick={handleSave} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-medium">Save Check</Button>
                                        {selectedCheckId !== "new" && (
                                            <>
                                                <Button variant="outline" className="w-full sm:w-auto bg-sidebar border-border">Test This Check</Button>
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
    )
}
