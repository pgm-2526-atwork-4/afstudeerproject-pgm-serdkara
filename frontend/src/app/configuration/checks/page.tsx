"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { ChevronDown, ChevronRight, Search } from "lucide-react"
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
    const [checks, setChecks] = useState<Check[]>(initialChecks)
    const [searchQuery, setSearchQuery] = useState("")
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        "9.1 Incident Management": true
    })
    const [selectedCheckId, setSelectedCheckId] = useState<string | null>("9.1.1") // "new" for adding

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 3

    // Form toggle states
    const [showFewShot, setShowFewShot] = useState(false)
    const [showJudgeOverride, setShowJudgeOverride] = useState(false)
    const [showGroundTruth, setShowGroundTruth] = useState(false)

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
                    <div className="flex items-center justify-between max-w-3xl mx-auto relative">
                        {/* Connecting lines */}
                        <div className="absolute top-5 left-[16%] right-[16%] h-[2px] bg-border z-0"></div>
                        <div className="absolute top-5 left-[16%] w-0 h-[2px] bg-primary z-0"></div>

                        {/* Steps Container */}
                        <div className="relative z-10 grid grid-cols-3 w-full">
                            {/* Step 1 */}
                            <div className="flex flex-col items-center gap-2 md:gap-3">
                                <Link href="/configuration/checks" className="w-10 h-10 rounded-full shrink-0 bg-primary text-white flex items-center justify-center font-medium shadow-[0_0_15px_rgba(109,85,255,0.4)] cursor-pointer hover:scale-105 transition-transform">1</Link>
                                <div className="text-center h-12 md:h-auto">
                                    <div className="text-xs md:text-sm font-semibold text-foreground">Checks Library</div>
                                    <div className="hidden md:block text-xs text-muted-foreground">Define security requirements</div>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex flex-col items-center gap-2 md:gap-3">
                                <Link href="/configuration/judge" className="w-10 h-10 rounded-full shrink-0 bg-sidebar border-2 border-border text-muted-foreground flex items-center justify-center font-medium cursor-pointer hover:border-primary/50 hover:text-foreground transition-colors">2</Link>
                                <div className="text-center h-12 md:h-auto">
                                    <div className="text-xs md:text-sm font-medium text-muted-foreground">Judge Configuration</div>
                                    <div className="hidden md:block text-xs text-muted-foreground">Configure evaluation rubric</div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex flex-col items-center gap-2 md:gap-3">
                                <Link href="/configuration/settings" className="w-10 h-10 rounded-full shrink-0 bg-sidebar border-2 border-border text-muted-foreground flex items-center justify-center font-medium cursor-pointer hover:border-primary/50 hover:text-foreground transition-colors">3</Link>
                                <div className="text-center h-12 md:h-auto">
                                    <div className="text-xs md:text-sm font-medium text-muted-foreground">LLM Settings</div>
                                    <div className="hidden md:block text-xs text-muted-foreground">Choose models & parameters</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <div>
                <h2 className="text-lg font-medium tracking-tight mb-4 flex items-center">
                    Checks Library
                    <InfoTooltip title="Checks Library">
                        These constraints define exactly what needs to be verified in a policy document. They act as the &quot;Systemic Prompt&quot; baseline, guiding the LLM later when it evaluates a document.
                    </InfoTooltip>
                </h2>
                <p className="text-sm text-muted-foreground mb-4">Define <span className="font-semibold text-foreground">what</span> security requirements you want to check in your policy documents.</p>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Left Sidebar Menu */}
                    <div className="w-full md:w-72 shrink-0 space-y-4" data-tutorial-step="checks-library">
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
                    <Card className="flex-1 border-primary/30 shadow-[0_4px_20px_rgba(109,85,255,0.05)] overflow-hidden">
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
                                        <div className="bg-sidebar border border-border rounded-lg p-3 text-sm flex flex-col sm:flex-row sm:items-center sm:gap-2 text-muted-foreground sm:divide-x divide-border">
                                            <div className="py-1 sm:py-0 sm:pr-2">Usage: <span className="text-foreground">{formData.usage} runs</span></div>
                                            <div className="py-1 sm:py-0 sm:px-2">Human Agreement: <span className="text-emerald-500 font-medium">{formData.humanAgreement}%</span></div>
                                            <div className="py-1 sm:py-0 sm:pl-2">Last modified: {formData.lastModified}</div>
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

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                                                    <p className="text-sm text-muted-foreground mb-4">
                                                        Establish the benchmark for <strong className="text-foreground">{formData.id || 'this check'}</strong>. Define the expected human outcome for specific documents so the Judge LLM&apos;s accuracy can be measured against it.
                                                    </p>

                                                    <div className="border border-border rounded-lg overflow-x-auto mb-4">
                                                        <table className="w-full text-sm text-left min-w-[600px]">
                                                            <thead className="bg-sidebar border-b border-border text-muted-foreground">
                                                                <tr>
                                                                    <th className="px-4 py-3 font-medium">Document</th>
                                                                    <th className="px-4 py-3 font-medium">Expected Result</th>
                                                                    <th className="px-4 py-3 font-medium">Reasoning / Notes</th>
                                                                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border text-xs">
                                                                <tr className="hover:bg-sidebar/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-foreground">Policy_Document_1.pdf</td>
                                                                    <td className="px-4 py-3"><span className="text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">Pass</span></td>
                                                                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[150px]">Mentions incident response team explicitly on pg. 4.</td>
                                                                    <td className="px-4 py-3 text-right">
                                                                        <Button variant="ghost" size="sm" className="h-7 text-muted-foreground hover:text-foreground">Edit</Button>
                                                                    </td>
                                                                </tr>
                                                                <tr className="hover:bg-sidebar/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-foreground">Policy_Document_2.pdf</td>
                                                                    <td className="px-4 py-3"><span className="text-rose-500 font-semibold bg-rose-500/10 px-2 py-0.5 rounded">Fail</span></td>
                                                                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[150px]">Missing escalation procedures.</td>
                                                                    <td className="px-4 py-3 text-right">
                                                                        <Button variant="ghost" size="sm" className="h-7 text-muted-foreground hover:text-foreground">Edit</Button>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    <Button variant="outline" size="sm" className="w-full bg-sidebar border-dashed border-amber-500/50 text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-500/10">
                                                        + Add Document Baseline
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="border border-border/50 rounded-lg overflow-hidden transition-all duration-200">
                                            <button
                                                onClick={() => setShowFewShot(!showFewShot)}
                                                className="w-full bg-primary/10 hover:bg-primary/15 transition-colors border border-primary/30 rounded-lg p-3 flex items-center justify-between transition-colors"
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
                                                className="w-full bg-sidebar hover:bg-white/[0.02] transition-colors border border-border rounded-lg p-3 flex items-center justify-between transition-colors"
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
