"use client";

import Link from 'next/link';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { UploadCloud, FileText, ChevronDown, ChevronRight, Play, Settings2, ShieldCheck, CheckCircle2, Trash2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog';
import { NoticeDialog } from '@/components/ui/NoticeDialog';
import { Button } from '@/components/ui/Button';
import { apiUrl } from '@/lib/api';

interface CheckDefinition {
    id: string;
    name: string;
    prompt: string;
    category?: string;
}

interface DocumentListItem {
    id: string;
    name: string;
    size: number;
    uploaded_at?: string;
    latest_run_status?: string;
    latest_run_id?: string;
}

interface DetectChecksResponse {
    relevant_check_ids?: string[];
    detection_mode?: string;
    detection_reason?: string;
    selected_count?: number;
    total_available_checks?: number;
}

export default function DocumentsPage() {
    const { theme, resolvedTheme } = useTheme();
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isStartingRun, setIsStartingRun] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [documentId, setDocumentId] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    
    // Check Detection & Customization State
    const [isDetectingChecks, setIsDetectingChecks] = useState(false);
    const [allAvailableChecks, setAllAvailableChecks] = useState<CheckDefinition[]>([]);
    const [detectedCheckIds, setDetectedCheckIds] = useState<string[]>([]);
    const [targetChecksMode, setTargetChecksMode] = useState<'auto' | 'all' | 'custom'>('auto');
    const [customCheckIds, setCustomCheckIds] = useState<string[]>([]);
    const [detectionMeta, setDetectionMeta] = useState<{ mode: string; reason?: string; selected: number; total: number } | null>(null);
    
    // Recent Documents Config State
    const [expandedDocConfigId, setExpandedDocConfigId] = useState<string | null>(null);
    const [isDetectingRecent, setIsDetectingRecent] = useState<string | null>(null);

    const [recentDocs, setRecentDocs] = useState<DocumentListItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    const filteredDocs = useMemo(() => {
        if (!searchQuery) return recentDocs;
        return recentDocs.filter(doc =>
            doc.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [recentDocs, searchQuery]);

    const totalPages = Math.ceil(filteredDocs.length / ITEMS_PER_PAGE) || 1;
    const paginatedDocs = filteredDocs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [documentToDelete, setDocumentToDelete] = useState<{ id: string, name: string } | null>(null);
    const [notice, setNotice] = useState<{ isOpen: boolean; title: string; message: string }>({
        isOpen: false,
        title: '',
        message: '',
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const openNotice = (title: string, message: string) => {
        setNotice({ isOpen: true, title, message });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    useEffect(() => {
        const fetchDocs = async () => {
            try {
                const res = await fetch(apiUrl('/api/files'));
                if (res.ok) {
                    const data = await res.json();
                    setRecentDocs(data);
                }
            } catch (err) {
                // Warning instead of error to avoid Next.js overlay during development
                console.warn("Failed to fetch documents from backend:", err);
            }
        };
        fetchDocs();
    }, [uploadedFile]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    };

    const handleFileUpload = async (file: File) => {
        setIsUploading(true);
        setIsDetectingChecks(false);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(apiUrl('/api/upload'), {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Upload failed');
            }

            const data = await response.json();
            setDocumentId(data.id);
            setUploadedFile(file);
            
            // Start detection phase
            setIsUploading(false);
            setIsDetectingChecks(true);
            
            // Optimistically load checks and run detection in parallel
            const [checksRes, detectRes] = await Promise.all([
                fetch(apiUrl('/api/checks')),
                fetch(apiUrl(`/api/files/${data.id}/detect-checks`), { method: 'POST' })
            ]);
            
            let loadedChecks: CheckDefinition[] = [];
            if (checksRes.ok) {
                loadedChecks = await checksRes.json() as CheckDefinition[];
                setAllAvailableChecks(loadedChecks);
            }
            
            if (detectRes.ok) {
                const detectData = await detectRes.json() as DetectChecksResponse;
                const relevantIds = detectData.relevant_check_ids || [];
                setDetectedCheckIds(relevantIds);
                setCustomCheckIds(relevantIds); 
                setDetectionMeta({
                    mode: detectData.detection_mode || 'llm',
                    reason: detectData.detection_reason || '',
                    selected: detectData.selected_count ?? relevantIds.length,
                    total: detectData.total_available_checks ?? loadedChecks.length,
                });
            } else {
                // Fallback to all checks if detection fails
                const allIds = loadedChecks.map(c => c.id);
                setDetectedCheckIds(allIds);
                setCustomCheckIds(allIds);
                const statusReason = `Detection endpoint failed (HTTP ${detectRes.status}). Falling back to all loaded checks.`;
                setDetectionMeta({
                    mode: 'frontend_fallback',
                    reason: statusReason,
                    selected: allIds.length,
                    total: loadedChecks.length,
                });
            }
            
            setTargetChecksMode('auto');

        } catch (error) {
            console.error("Error uploading file:", error);
            openNotice('Upload Failed', `Upload failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsUploading(false);
            setIsDetectingChecks(false);
        }
    };

    const handleExpandConfig = async (docId: string) => {
        if (expandedDocConfigId === docId) {
            setExpandedDocConfigId(null);
            return;
        }
        
        setIsDetectingRecent(docId);
        setExpandedDocConfigId(docId);
        setTargetChecksMode('auto'); // Reset before opening
        
        try {
            const [checksResult, detectResult] = await Promise.allSettled([
                fetch(apiUrl('/api/checks')),
                fetch(apiUrl(`/api/files/${docId}/detect-checks`), { method: 'POST' })
            ]);
            
            let loadedChecks: CheckDefinition[] = [];
            if (checksResult.status === 'fulfilled' && checksResult.value.ok) {
                loadedChecks = await checksResult.value.json() as CheckDefinition[];
                setAllAvailableChecks(loadedChecks);
            }
            
            if (detectResult.status === 'fulfilled' && detectResult.value.ok) {
                const detectData = await detectResult.value.json() as DetectChecksResponse;
                const relevantIds = detectData.relevant_check_ids || [];
                setDetectedCheckIds(relevantIds);
                setCustomCheckIds(relevantIds); 
                setDetectionMeta({
                    mode: detectData.detection_mode || 'llm',
                    reason: detectData.detection_reason || '',
                    selected: detectData.selected_count ?? relevantIds.length,
                    total: detectData.total_available_checks ?? loadedChecks.length,
                });
            } else {
                const allIds = loadedChecks.map(c => c.id);
                setDetectedCheckIds(allIds);
                setCustomCheckIds(allIds);
                const detectStatus = detectResult.status === 'fulfilled' ? detectResult.value.status : 'network';
                setDetectionMeta({
                    mode: 'frontend_fallback',
                    reason: `Detection endpoint failed (HTTP ${detectStatus}). Falling back to all loaded checks.`,
                    selected: allIds.length,
                    total: loadedChecks.length,
                });
            }
            
        } catch (error) {
            // Use a warning here so transient backend/network issues do not trigger the Next.js error overlay in dev.
            console.warn('Failed to load document config, using fallback checks.', error);
        } finally {
            setIsDetectingRecent(null);
        }
    };

    const handleRunWithDefaults = async () => {
        if (!documentId) return;
        return handleStartRun(documentId);
    };

    const handleStartRun = async (docIdToRun: string) => {
        setIsStartingRun(true);
        try {
            // Determine which check IDs to use based on the current mode
            let targetIds: string[] = [];
            if (targetChecksMode === 'auto') {
                targetIds = detectedCheckIds;
            } else if (targetChecksMode === 'all') {
                targetIds = allAvailableChecks.map(c => c.id);
            } else if (targetChecksMode === 'custom') {
                targetIds = customCheckIds;
            }
            
            // Filter all available checks by the target IDs to get the full evidence_type objects
            // If allAvailableChecks is empty (e.g. recent docs run), fetch them.
            let checksForRun = allAvailableChecks;
            if (checksForRun.length === 0) {
                 const checksRes = await fetch(apiUrl('/api/checks'));
                 if (checksRes.ok) {
                     checksForRun = await checksRes.json();
                 }
            }
            
            // If targetIds is empty (e.g. clicking run from recent docs without uploading here), fallback to all
            if (targetIds.length === 0) {
                  targetIds = checksForRun.map((c) => c.id);
            }
            
            const activeChecks = checksForRun.filter(c => targetIds.includes(c.id));
            
              const evidenceTypes = activeChecks.map(chk => ({
                value: `TEST_${chk.id.replace(/\./g, '_')}`,
                name: chk.name,
                instructions: chk.prompt
            }));

            const response = await fetch(apiUrl('/api/analyze'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    document_id: docIdToRun,
                    evidence_types: evidenceTypes.length > 0 ? evidenceTypes : undefined
                })
            });

            if (!response.ok) throw new Error('Analysis failed to start');
            const data = await response.json();

            // Navigate immediately - the backend processes in the background
            router.push(`/runs/results?runId=${data.run_id}`);
        } catch (error) {
            console.error("Failed to start run:", error);
            openNotice('Run Failed', 'Failed to start analysis run.');
        } finally {
            setIsStartingRun(false);
        }
    };

    const promptDeleteDocument = (doc: DocumentListItem, e: React.MouseEvent) => {
        e.stopPropagation();
        setDocumentToDelete({ id: doc.id, name: doc.name });
    };

    const confirmDeleteDocument = async () => {
        if (!documentToDelete) return;

        const id = documentToDelete.id;
        setDeletingId(id);

        try {
            const res = await fetch(apiUrl(`/api/files/${id}`), {
                method: 'DELETE'
            });
            if (res.ok) {
                setRecentDocs(docs => docs.filter(d => d.id !== id));
                if (documentId === id) {
                    setDocumentId(null);
                    setUploadedFile(null);
                }
                setDocumentToDelete(null); // Close the dialog
            } else {
                const data = await res.json();
                openNotice('Delete Failed', data.error || 'Failed to delete document');
                setDocumentToDelete(null); // Close the dialog
            }
        } catch (err) {
            console.error("Failed to delete document", err);
            openNotice('Delete Failed', 'Network error. Failed to delete document.');
            setDocumentToDelete(null); // Close the dialog
        } finally {
            setDeletingId(null);
        }
    };

    const isLight = theme === 'system' ? resolvedTheme === 'light' : theme === 'light';

    return (
        <div className="max-w-6xl mx-auto pb-0">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center">
                        Documents & Analysis
                        <InfoTooltip title="Drop & Go Analysis">
                            <p>Upload your policy document here to automatically trigger a scan. The system will attempt to auto-detect the framework (e.g., ISO 27001) and suggest the best configuration and checks.</p>
                            <p className="mt-2 text-muted-foreground text-xs">Supported Formats: PDF, DOCX, TXT. Tables in PDFs are extracted as markdown.</p>
                        </InfoTooltip>
                    </h1>
                    <p className="text-muted-foreground">Upload a policy document to instantly validate it against security frameworks.</p>
                </div>
            </div>

            {/* Main Upload / Drop & Go Area */}
            {(!uploadedFile || isDetectingChecks) ? (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
            relative cursor-pointer group rounded-2xl border-2 border-dashed 
            transition-all duration-300 ease-in-out p-12 flex flex-col items-center justify-center text-center
            min-h-[300px] mb-6 shadow-sm
            ${isDragging
                            ? 'border-primary bg-primary/5 scale-[1.01]'
                            : 'border-border/60 bg-sidebar/50 hover:bg-sidebar hover:border-primary/50'
                        }
          `}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.docx,.txt"
                        disabled={isUploading || isDetectingChecks}
                    />
                    {isUploading ? (
                        <>
                            <div className="p-5 rounded-full mb-6 bg-primary/10 text-primary">
                                <Spinner size="icon" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Uploading document...</h3>
                            <p className="text-muted-foreground mb-6 max-w-md">
                                Securely transferring your file to the server.
                            </p>
                        </>
                    ) : isDetectingChecks ? (
                        <>
                            <div className="p-5 rounded-full mb-6 bg-primary/10 text-primary">
                                <Spinner size="icon" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Analyzing document structure...</h3>
                            <p className="text-muted-foreground mb-6 max-w-md">
                                Our AI is reading your policy to automatically detect which compliance frameworks and checks apply.
                            </p>
                        </>
                    ) : (
                        <>
                            <div className={`p-5 rounded-full mb-6 transition-colors duration-300 ${isDragging ? 'bg-primary/20 text-primary' : 'bg-background/80 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10'}`}>
                                <UploadCloud className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Drag & Drop your policy document</h3>
                            <p className="text-muted-foreground mb-6 max-w-md">
                                Automatically detect framework, apply relevant checks, and validate using our Judge LLM. Supports PDF, DOCX, TXT.
                            </p>
                            <div className="inline-flex items-center justify-center px-6 py-3 font-medium text-white bg-primary rounded-full group-hover:bg-primary/90 transition-colors duration-300 shadow-sm">
                                Browse Files
                            </div>
                        </>
                    )}
                </div>
            ) : (
                /* Auto-suggested Run State */
                <div className="bg-sidebar border border-border shadow-md rounded-2xl p-8 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />

                    <div className="flex flex-col lg:flex-row gap-8 items-start relative z-10">
                        {/* Left: Document Info */}
                        <div className="flex-1 space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl border border-indigo-500/20">
                                    <FileText className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold truncate pr-4 text-foreground">
                                        {documentId ? (
                                            <a href={apiUrl(`/api/files/${documentId}/download`)} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-primary transition-colors">
                                                {uploadedFile.name}
                                            </a>
                                        ) : (
                                            uploadedFile.name
                                        )}
                                    </h2>
                                    <p className="text-muted-foreground text-sm font-medium mt-1 inline-flex items-center gap-2">
                                        <span className="bg-background px-2 py-0.5 rounded border border-border">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                        Ready for analysis
                                    </p>
                                </div>
                            </div>

                            {/* Smart Auto-detection Box */}
                            <div className={`p-5 rounded-xl border ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/20'} flex items-start gap-4 shadow-sm`}>
                                <ShieldCheck className={`w-6 h-6 mt-0.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                                <div>
                                    <h4 className={`font-bold mb-1 ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>Detected Relevant Checks</h4>
                                    <p className={`text-sm ${isLight ? 'text-emerald-700' : 'text-emerald-500/80'} leading-relaxed`}>
                                        We analyzed the document structure and mapped it to our compliance frameworks.
                                        <span className="font-semibold ml-1">{detectionMeta?.selected ?? detectedCheckIds.length} relevant checks</span>
                                        {` out of ${detectionMeta?.total ?? (allAvailableChecks.length || detectedCheckIds.length)}`} have been automatically selected.
                                    </p>
                                    {detectionMeta?.mode && detectionMeta.mode !== 'llm' && (
                                        <p className={`text-xs mt-2 ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>
                                            Detection mode: {detectionMeta.mode}. {detectionMeta.reason || 'Fallback detection was used.'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="w-full lg:w-80 flex flex-col gap-4">
                            <button
                                onClick={handleRunWithDefaults}
                                disabled={isStartingRun}
                                className={`w-full py-4 px-6 rounded-xl shadow-[0_8px_20px_-6px_rgba(109,85,255,0.4)] transition-all duration-300 flex items-center justify-center gap-3 group ${isStartingRun ? 'bg-primary/70 text-white cursor-not-allowed' : 'bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white font-bold'} cursor-pointer`}
                            >
                                {isStartingRun ? (
                                    <>
                                        <Spinner className="w-5 h-5 text-white" />
                                        Starting...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
                                        Run with Defaults
                                    </>
                                )}
                            </button>

                            {/* Progressive Disclosure: Advanced Settings */}
                            <div className="mt-1 lg:mt-3 border border-border/80 bg-background/50 rounded-xl overflow-hidden transition-all duration-300 shadow-sm">
                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="w-full px-5 py-3.5 flex items-center justify-between text-sm font-medium text-foreground hover:bg-sidebar/50 transition-colors cursor-pointer"
                                >
                                    <span className="flex items-center gap-2 text-muted-foreground">
                                        <Settings2 className="w-4 h-4" />
                                        Customize Config
                                    </span>
                                    {showAdvanced ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                </button>

                                {showAdvanced && (
                                    <div className="p-5 border-t border-border/50 space-y-4 bg-sidebar/30 animate-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Checks</label>
                                            <select 
                                                value={targetChecksMode}
                                                onChange={(e) => setTargetChecksMode(e.target.value as 'auto' | 'all' | 'custom')}
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary shadow-sm"
                                            >
                                                <option value="auto">Auto-detected ({detectedCheckIds.length} checks)</option>
                                                <option value="all">All Available ({allAvailableChecks.length} checks)</option>
                                                <option value="custom">Custom Selection...</option>
                                            </select>
                                        </div>
                                        {targetChecksMode === 'custom' && (
                                            <div className="mt-2 p-3 bg-background border border-border rounded-lg max-h-48 overflow-y-auto space-y-3">
                                                {allAvailableChecks.map(chk => (
                                                    <label key={chk.id} className="flex items-start gap-2 text-sm cursor-pointer group">
                                                        <input 
                                                            type="checkbox" 
                                                            className="mt-1 shrink-0 accent-primary w-4 h-4 cursor-pointer" 
                                                            checked={customCheckIds.includes(chk.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setCustomCheckIds(prev => [...prev, chk.id]);
                                                                } else {
                                                                    setCustomCheckIds(prev => prev.filter(id => id !== chk.id));
                                                                }
                                                            }}
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-foreground group-hover:text-primary transition-colors leading-snug break-words">{chk.name}</div>
                                                            <div className="text-xs text-muted-foreground truncate">{chk.category}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Primary Model</label>
                                            <select className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary shadow-sm">
                                                <option>GPT-4o (Recommended)</option>
                                                <option>Claude 3.5 Sonnet</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Judge Template</label>
                                            <select className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary shadow-sm">
                                                <option>Default Rubric (5-point scale)</option>
                                                <option>Strict Compliance (Pass/Fail)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setUploadedFile(null)}
                                className="text-xs text-muted-foreground hover:text-foreground text-center mt-2 font-medium underline-offset-4 hover:underline"
                            >
                                Cancel and upload different file
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Activity List */}
            <div>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        Uploaded documents
                    </h2>
                    <div className="relative w-full lg:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="w-full bg-sidebar border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {paginatedDocs.length === 0 ? (
                        <div className="text-center p-8 border border-dashed border-border rounded-xl text-muted-foreground">
                            {recentDocs.length === 0 ? "No recent documents found." : "No documents match your search."}
                        </div>
                    ) : (
                        paginatedDocs.map((doc, idx: number) => (
                            <div
                                key={doc.id || idx}
                                className={`
                group flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 
                bg-sidebar border border-border rounded-xl transition-all duration-200
                hover:shadow-md hover:border-primary/30
              `}
                            >
                                <div className="flex items-start gap-4 mb-4 lg:mb-0 min-w-0">
                                    <div className={`mt-0.5 p-2 rounded-lg ${isLight ? 'bg-primary/5 text-primary' : 'bg-white/5 text-foreground'}`}>
                                        <FileText className="w-5 h-5 opacity-80" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-base text-foreground transition-colors break-all">
                                            <a href={apiUrl(`/api/files/${doc.id}/download`)} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-primary transition-colors">
                                                {doc.name}
                                            </a>
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                            <span className="font-mono text-xs opacity-70">{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                                            <span className="w-1 h-1 rounded-full bg-border"></span>
                                            <span>
                                                {doc.uploaded_at 
                                                    ? new Date(doc.uploaded_at).toLocaleString(undefined, { 
                                                        year: 'numeric', month: 'short', day: 'numeric', 
                                                        hour: '2-digit', minute: '2-digit' 
                                                      }) 
                                                    : 'Unknown date'}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-border"></span>
                                            <span className="flex items-center gap-1.5">
                                                {doc.latest_run_status === 'complete' ? (
                                                    <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Analysis Complete</>
                                                ) : doc.latest_run_status === 'running' ? (
                                                    <><Spinner size="sm" className="w-3.5 h-3.5 text-primary" /> Running</>
                                                ) : (
                                                    <><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground opacity-50" /> Ready to run</>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                    <div className="flex flex-col gap-2 w-full lg:w-auto">
                                        <div className="flex items-center gap-3 w-full lg:w-auto">
                                            {doc.latest_run_id && doc.latest_run_status === 'complete' ? (
                                                <Link
                                                    href={`/runs/results?runId=${doc.latest_run_id}`}
                                                    className="px-4 py-2 border border-border bg-background hover:bg-sidebar text-foreground font-medium rounded-lg text-sm transition-colors"
                                                >
                                                    View Report
                                                </Link>
                                            ) : (
                                                <span className="px-4 py-2 border border-dashed border-border/50 text-muted-foreground bg-background/50 font-medium rounded-lg text-sm cursor-not-allowed">
                                                    No runs yet
                                                </span>
                                            )}
                                            
                                            <button
                                                onClick={() => handleExpandConfig(doc.id)}
                                                className={`px-3 py-2 border font-medium rounded-lg text-sm transition-colors flex items-center gap-2 ${expandedDocConfigId === doc.id ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border bg-sidebar hover:bg-background text-foreground'}`}
                                            >
                                                <Settings2 className="w-3.5 h-3.5" />
                                                <span className="hidden sm:inline">Customize</span>
                                            </button>

                                            <button
                                                onClick={() => handleStartRun(doc.id)}
                                                className="px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white font-semibold rounded-lg text-sm transition-colors flex items-center gap-2 group/btn cursor-pointer"
                                            >
                                                <Play className="w-3.5 h-3.5 fill-current" />
                                                Run Analysis
                                            </button>

                                            <button
                                                onClick={(e) => promptDeleteDocument(doc, e)}
                                                disabled={deletingId === doc.id}
                                                className="p-2 ml-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                title="Delete Document"
                                            >
                                                {deletingId === doc.id ? (
                                                    <Spinner size="sm" className="w-4 h-4 text-red-500" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>

                                        {expandedDocConfigId === doc.id && (
                                            <div className="w-full mt-2 p-5 bg-background/50 border border-border/80 rounded-xl space-y-4 animate-in slide-in-from-top-2">
                                                {isDetectingRecent === doc.id ? (
                                                    <div className="flex items-center gap-3 text-sm text-foreground font-medium p-2">
                                                        <Spinner size="sm" className="text-primary" />
                                                        Detecting relevant checks...
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Checks</label>
                                                            <select 
                                                                value={targetChecksMode}
                                                                onChange={(e) => setTargetChecksMode(e.target.value as 'auto' | 'all' | 'custom')}
                                                                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary shadow-sm"
                                                            >
                                                                <option value="auto">Auto-detected ({detectedCheckIds.length} checks)</option>
                                                                <option value="all">All Available ({allAvailableChecks.length} checks)</option>
                                                                <option value="custom">Custom Selection...</option>
                                                            </select>
                                                        </div>
                                                        {detectionMeta && (
                                                            <div className="text-xs text-muted-foreground">
                                                                Detection mode: {detectionMeta.mode} • Selected {detectionMeta.selected}/{detectionMeta.total} checks
                                                            </div>
                                                        )}
                                                        {targetChecksMode === 'custom' && (
                                                            <div className="mt-2 p-3 bg-background border border-border rounded-lg max-h-48 overflow-y-auto space-y-3">
                                                                {allAvailableChecks.map(chk => (
                                                                    <label key={chk.id} className="flex items-start gap-2 text-sm cursor-pointer group">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            className="mt-1 shrink-0 accent-primary w-4 h-4 cursor-pointer" 
                                                                            checked={customCheckIds.includes(chk.id)}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) setCustomCheckIds(prev => [...prev, chk.id]);
                                                                                else setCustomCheckIds(prev => prev.filter(id => id !== chk.id));
                                                                            }}
                                                                        />
                                                                        <div className="min-w-0">
                                                                            <div className="font-medium text-foreground group-hover:text-primary transition-colors leading-snug break-words">{chk.name}</div>
                                                                            <div className="text-xs text-muted-foreground truncate">{chk.category}</div>
                                                                        </div>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {recentDocs.length > 0 && (
                    <div className="flex items-center justify-between pt-6">
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
                )}
            </div>
            {/* Delete Confirmation Dialog */}
            <ConfirmDeleteDialog
                isOpen={documentToDelete !== null}
                isDeleting={deletingId !== null}
                documentName={documentToDelete?.name || ''}
                onClose={() => setDocumentToDelete(null)}
                onConfirm={confirmDeleteDocument}
            />
            <NoticeDialog
                isOpen={notice.isOpen}
                title={notice.title}
                message={notice.message}
                onClose={() => setNotice(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
