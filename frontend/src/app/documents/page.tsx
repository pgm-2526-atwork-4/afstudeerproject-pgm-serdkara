"use client";

import Link from 'next/link';
import { useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import { UploadCloud, FileText, ChevronDown, ChevronRight, Play, Settings2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

export default function DocumentsPage() {
    const { theme, resolvedTheme } = useTheme();
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setUploadedFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploadedFile(e.target.files[0]);
        }
    };

    const handleRunWithDefaults = () => {
        router.push('/runs/results?newRun=true');
    };

    const isLight = theme === 'system' ? resolvedTheme === 'light' : theme === 'light';

    return (
        <div className="max-w-6xl mx-auto pb-12">
            <div className="flex justify-between items-end mb-8">
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
            {!uploadedFile ? (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
            relative cursor-pointer group rounded-2xl border-2 border-dashed 
            transition-all duration-300 ease-in-out p-12 flex flex-col items-center justify-center text-center
            min-h-[300px] mb-12 shadow-sm
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
                    />
                    <div className={`p-5 rounded-full mb-6 transition-colors duration-300 ${isDragging ? 'bg-primary/20 text-primary' : 'bg-background/80 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10'}`}>
                        <UploadCloud className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Drag & Drop your policy document</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        Automatically detect framework, apply relevant checks, and validate using our Judge LLM. Supports PDF, DOCX, TXT.
                    </p>
                    <div className="inline-flex items-center justify-center px-6 py-3 font-medium text-primary bg-primary/10 rounded-full group-hover:bg-primary group-hover:text-white transition-colors duration-300 shadow-sm">
                        Browse Files
                    </div>
                </div>
            ) : (
                /* Auto-suggested Run State */
                <div className="bg-sidebar border border-border shadow-md rounded-2xl p-8 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />

                    <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                        {/* Left: Document Info */}
                        <div className="flex-1 space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl border border-indigo-500/20">
                                    <FileText className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold truncate pr-4 text-foreground">{uploadedFile.name}</h2>
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
                                    <h4 className={`font-bold mb-1 ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>Detected: ISO 27001 Incident Management</h4>
                                    <p className={`text-sm ${isLight ? 'text-emerald-700' : 'text-emerald-500/80'} leading-relaxed`}>
                                        We analyzed the document structure and mapped it to our compliance frameworks.
                                        <span className="font-semibold ml-1">8 relevant checks</span> have been automatically selected.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="w-full md:w-80 flex flex-col gap-4">
                            <button
                                onClick={handleRunWithDefaults}
                                className="w-full py-4 px-6 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white font-bold rounded-xl shadow-[0_8px_20px_-6px_rgba(109,85,255,0.4)] transition-all duration-300 flex items-center justify-center gap-3 group"
                            >
                                <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
                                Run with Defaults
                            </button>

                            {/* Progressive Disclosure: Advanced Settings */}
                            <div className="border border-border/80 bg-background/50 rounded-xl overflow-hidden transition-all duration-300 shadow-sm">
                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="w-full px-5 py-3.5 flex items-center justify-between text-sm font-medium text-foreground hover:bg-sidebar/50 transition-colors"
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
                                            <select className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary shadow-sm">
                                                <option>Auto-detected (8 checks)</option>
                                                <option>All Incident Management (12 checks)</option>
                                                <option>Custom Selection...</option>
                                            </select>
                                        </div>
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
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    Recent Documents
                </h2>

                <div className="grid grid-cols-1 gap-4">
                    {[
                        { id: 'RUN-023', doc: 'Policy_v2.pdf', date: '2 hours ago', pass: 7, total: 8, status: 'complete' },
                        { id: 'RUN-022', doc: 'Security_Policy_Draft.docx', date: 'Yesterday', pass: 15, total: 15, status: 'complete' },
                        { id: 'RUN-021', doc: 'Compliance_Doc_2025.pdf', date: '2 days ago', pass: 10, total: 12, status: 'needs_review' },
                        { id: 'RUN-020', doc: 'Legacy_Policy_v1.txt', date: 'Last week', pass: 14, total: 15, status: 'complete' }
                    ].map((run) => (
                        <div
                            key={run.id}
                            className={`
                group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 
                bg-sidebar border border-border rounded-xl transition-all duration-200
                hover:shadow-md hover:border-primary/30
              `}
                        >
                            <div className="flex items-start gap-4 mb-4 sm:mb-0">
                                <div className={`mt-0.5 p-2 rounded-lg ${isLight ? 'bg-primary/5 text-primary' : 'bg-white/5 text-foreground'}`}>
                                    <FileText className="w-5 h-5 opacity-80" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">{run.doc}</h3>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                        <span className="font-mono text-xs opacity-70">{run.id}</span>
                                        <span className="w-1 h-1 rounded-full bg-border"></span>
                                        <span>{run.date}</span>
                                        <span className="w-1 h-1 rounded-full bg-border"></span>
                                        <span className="flex items-center gap-1.5">
                                            <CheckCircle2 className={`w-3.5 h-3.5 ${run.pass === run.total ? 'text-emerald-500' : 'text-amber-500'}`} />
                                            {run.pass}/{run.total} passing
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <Link
                                    href="/runs/results"
                                    className="px-4 py-2 border border-border bg-background hover:bg-sidebar text-foreground font-medium rounded-lg text-sm transition-colors"
                                >
                                    View Report
                                </Link>
                                <Link
                                    href="/runs/results?newRun=true"
                                    className="px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white font-semibold rounded-lg text-sm transition-colors flex items-center gap-2 group/btn"
                                >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    Analyze Again
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
