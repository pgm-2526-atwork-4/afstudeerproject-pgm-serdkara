"use client"

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from 'next-themes';
import { ArrowUp, ArrowDown, CheckCircle2, ChevronLeft, ChevronRight, FileText, Activity, Play, XCircle } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { Spinner } from '@/components/ui/Spinner';
import { NoticeDialog } from '@/components/ui/NoticeDialog';
import { authFetch } from '@/lib/api';

type Document = { id: string; name: string };
type RunCheck = {
  check_id: string;
  judge_assessment?: {
    verdict?: string;
    score?: number;
  };
};

type Run = {
  run_id: string;
  document_id: string;
  timestamp: string;
  status: string;
  checks: RunCheck[];
};

type BenchmarkHistoryItem = {
  timestamp: string;
  agreement_rate: number;
  total: number;
  correct: number;
  mismatches: number;
};

type BenchmarkLatest = {
  timestamp: string;
  agreement_rate: number;
  total: number;
  correct: number;
  mismatches: number;
  per_check?: Record<string, { agreement_rate?: number; total?: number; correct?: number }>;
};

type DashboardReport = {
  metrics?: {
    total_documents?: number;
    total_runs?: number;
    average_score?: number;
    flagged_outputs?: number;
  };
  agreement?: {
    agree?: number;
    disagree?: number;
    flag?: number;
  };
};

type BenchmarkPerCheckEntry = {
  agreement_rate?: number;
  total?: number;
  correct?: number;
};

type BenchmarkDetail = {
  check_id: string;
  expected_outcome: string;
  actual_verdict: string;
  actual_classification: string;
  is_correct: boolean;
};

type BenchmarkResultData = {
  agreement_rate: number;
  total: number;
  correct: number;
  per_check: Record<string, BenchmarkPerCheckEntry>;
  timestamp?: string;
  details: BenchmarkDetail[];
};

function RunSelector({
  label,
  docs,
  selectedRun,
  disabledRunId,
  onSelectRun
}: {
  label: string,
  docs: Document[],
  selectedRun: Run | null,
  disabledRunId: string | null,
  onSelectRun: (run: Run | null) => void
}) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [runsForDoc, setRunsForDoc] = useState<Run[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);

  const [docPage, setDocPage] = useState(0);
  const [runPage, setRunPage] = useState(0);

  const ITEMS_PER_PAGE = 3;

  const totalDocPages = Math.ceil(docs.length / ITEMS_PER_PAGE);
  const visibleDocs = docs.slice(docPage * ITEMS_PER_PAGE, (docPage + 1) * ITEMS_PER_PAGE);

  const totalRunPages = Math.ceil(runsForDoc.length / ITEMS_PER_PAGE);
  const visibleRuns = runsForDoc.slice(runPage * ITEMS_PER_PAGE, (runPage + 1) * ITEMS_PER_PAGE);

  const handleDocSelect = async (docId: string) => {
    setSelectedDocId(docId);
    setRunPage(0);
    onSelectRun(null); // Clear selected run when changing document
    
    setIsLoadingRuns(true);
    try {
      const res = await authFetch(`/api/files/${docId}/runs`);
      if (res.ok) {
        const data = await res.json();
        setRunsForDoc(data);
      } else {
        setRunsForDoc([]);
      }
    } catch (e) {
      console.error("Failed to fetch runs", e);
      setRunsForDoc([]);
    } finally {
      setIsLoadingRuns(false);
    }
  };

  return (
    <div className="flex-1 bg-background border border-border rounded-xl p-5 shadow-sm">
      <h4 className="font-bold text-foreground mb-4 pb-2 border-b border-border/50 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" /> {label}
      </h4>

      {/* Document Selection */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px]">1</span> Select Document
          </span>
          <div className="flex items-center gap-1 bg-sidebar rounded-md border border-border/50 p-0.5">
            <button
              onClick={() => setDocPage(p => Math.max(0, p - 1))}
              disabled={docPage === 0}
              className="p-1 rounded hover:bg-background disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-foreground px-1">{docPage + 1}/{totalDocPages || 1}</span>
            <button
              onClick={() => setDocPage(p => Math.min(totalDocPages - 1, p + 1))}
              disabled={docPage >= totalDocPages - 1}
              className="p-1 rounded hover:bg-background disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="space-y-1.5 min-h-35">
          {visibleDocs.map(doc => (
            <button
              key={doc.id}
              onClick={() => handleDocSelect(doc.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border ${selectedDocId === doc.id ? 'bg-primary/10 border-primary/40 text-primary font-medium shadow-[0_0_10px_rgba(139,92,246,0.1)]' : 'border-border/40 bg-sidebar hover:border-border hover:bg-white/2 text-foreground'}`}
            >
              <div className="flex items-center gap-2 max-w-full">
                <FileText className={`w-4 h-4 shrink-0 ${selectedDocId === doc.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="truncate">{doc.name}</span>
              </div>
            </button>
          ))}
          {visibleDocs.length === 0 && <div className="text-xs text-muted-foreground p-3 text-center border border-dashed border-border rounded-lg bg-sidebar/50">No documents</div>}
        </div>
      </div>

      {/* Run Selection */}
      <div className={`transition-opacity duration-300 ${selectedDocId ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px]">2</span> Select Run
          </span>
          <div className="flex items-center gap-1 bg-sidebar rounded-md border border-border/50 p-0.5">
            <button
              onClick={() => setRunPage(p => Math.max(0, p - 1))}
              disabled={runPage === 0}
              className="p-1 rounded hover:bg-background disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-foreground px-1">{runPage + 1}/{totalRunPages || 1}</span>
            <button
              onClick={() => setRunPage(p => Math.min(totalRunPages - 1, p + 1))}
              disabled={runPage >= totalRunPages - 1}
              className="p-1 rounded hover:bg-background disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="space-y-1.5 min-h-35 relative">
          {isLoadingRuns ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <Spinner size="sm" />
            </div>
          ) : null}
          {visibleRuns.map(run => {
            const isSelected = selectedRun?.run_id === run.run_id;
            const isDisabled = run.run_id === disabledRunId;
            const dateStr = run.timestamp ? new Date(run.timestamp).toLocaleString(undefined, {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'Unknown Time';

            return (
              <button
                key={run.run_id}
                onClick={() => onSelectRun(run)}
                disabled={isDisabled}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border flex justify-between items-center 
                  ${isSelected ? 'bg-primary/10 border-primary/40 text-primary font-medium shadow-[0_0_10px_rgba(139,92,246,0.1)]' : 'border-border/40 bg-sidebar hover:border-border hover:bg-white/2 text-foreground'}
                  ${isDisabled ? 'opacity-40 cursor-not-allowed bg-sidebar/50' : ''}
                `}
              >
                <div className="flex flex-col min-w-0 w-full">
                   <div className="flex justify-between items-center w-full gap-2">
                       <span className="font-mono text-xs truncate flex-1 min-w-0" title={run.run_id}>{run.run_id.split('_')[1] || run.run_id}</span>
                       <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm shrink-0 ${run.status === 'complete' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{run.status}</span>
                   </div>
                   <div className={`text-xs mt-1 truncate ${isSelected ? 'text-primary/70' : 'text-muted-foreground'}`}>{dateStr}</div>
                </div>
              </button>
            );
          })}
          {selectedDocId && visibleRuns.length === 0 && !isLoadingRuns && <div className="text-xs text-muted-foreground p-3 text-center border border-dashed border-border rounded-lg bg-sidebar/50">No runs found for this document.</div>}
          {!selectedDocId && <div className="text-xs text-muted-foreground p-3 text-center border border-dashed border-border rounded-lg bg-sidebar/50">Select a document first.</div>}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { theme, resolvedTheme } = useTheme();
  
  const [docs, setDocs] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [dashboardReport, setDashboardReport] = useState<DashboardReport | null>(null);

  const [selectedRunA, setSelectedRunA] = useState<Run | null>(null);
  const [selectedRunB, setSelectedRunB] = useState<Run | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [notice, setNotice] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const openNotice = (title: string, message: string) => {
    setNotice({ isOpen: true, title, message });
  };

  // Fetch Documents once on mount
  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await authFetch('/api/files');
        if (res.ok) {
          const data = await res.json();
          setDocs(data);
        }
      } catch (e) {
        console.error("Failed to fetch documents", e);
      } finally {
        setIsLoadingDocs(false);
      }
    }
    fetchDocs();
  }, []);

  const loadDashboardReport = async () => {
    try {
      const res = await authFetch('/api/reports/agreement');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const message = errData?.error || `HTTP ${res.status}`;
        openNotice('Dashboard Data Failed', `Could not load human review metrics: ${message}`);
        return;
      }
      const data = await res.json();
      setDashboardReport(data);
    } catch (e) {
      console.error('Failed to fetch dashboard report', e);
    }
  };

  useEffect(() => {
    loadDashboardReport();
    const interval = setInterval(() => {
      loadDashboardReport();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Benchmarking State
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResultData | null>(null);
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkHistoryItem[]>([]);

  const loadBenchmarkData = async () => {
    try {
      const [latestRes, historyRes] = await Promise.all([
        authFetch('/api/golden-set/benchmark/latest'),
        authFetch('/api/golden-set/benchmark/history'),
      ]);

      if (latestRes.ok) {
        const latestData = await latestRes.json();
        const latest: BenchmarkLatest | null = latestData?.latest || null;
        if (latest) {
          setBenchmarkResult({
            agreement_rate: latest.agreement_rate,
            total: latest.total,
            correct: latest.correct,
            per_check: latest.per_check || {},
            timestamp: latest.timestamp,
            details: [],
          });
        }
      } else {
        const errData = await latestRes.json().catch(() => ({}));
        const message = errData?.error || `HTTP ${latestRes.status}`;
        openNotice('Benchmark Load Failed', `Could not load latest benchmark: ${message}`);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setBenchmarkHistory(Array.isArray(historyData?.history) ? historyData.history : []);
      } else {
        const errData = await historyRes.json().catch(() => ({}));
        const message = errData?.error || `HTTP ${historyRes.status}`;
        openNotice('Benchmark History Failed', `Could not load benchmark history: ${message}`);
      }
    } catch (e) {
      console.error('Failed to load benchmark history', e);
    }
  };

  useEffect(() => {
    loadBenchmarkData();
  }, []);

  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    try {
      const res = await authFetch('/api/golden-set/benchmark', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data?.error || `HTTP ${res.status}`;
        openNotice('Benchmark Failed', `Failed to run benchmark: ${message}`);
        return;
      }
      setBenchmarkResult(data);
      await loadBenchmarkData();
      await loadDashboardReport();
    } catch (e) {
      console.error(e);
      openNotice("Benchmark Failed", "Failed to run benchmark.");
    } finally {
      setIsBenchmarking(false);
    }
  };

  const isLight = theme === 'system' ? resolvedTheme === 'light' : theme === 'light';

  const agreementData = benchmarkHistory.map((item, idx) => {
    const dt = item.timestamp ? new Date(item.timestamp) : null;
    const dateLabel = dt ? dt.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }) : `#${idx + 1}`;
    return {
      run: `Benchmark ${idx + 1}`,
      agreement: item.agreement_rate,
      date: dateLabel,
    };
  });

  const latestAgreement = typeof benchmarkResult?.agreement_rate === 'number' ? benchmarkResult.agreement_rate : null;
  const previousAgreement = benchmarkHistory.length >= 2 ? benchmarkHistory[benchmarkHistory.length - 2].agreement_rate : null;
  const deltaAgreement = latestAgreement !== null && previousAgreement !== null ? latestAgreement - previousAgreement : null;

  const leastAgreeingCheck: { checkId: string; agreement_rate: number } | null = (() => {
    const perCheck = benchmarkResult?.per_check;
    if (!perCheck || typeof perCheck !== 'object') return null;
    const entries = Object.entries(perCheck).filter(([, value]) => typeof value?.agreement_rate === 'number');
    if (entries.length === 0) return null;
    entries.sort((a, b) => (a[1].agreement_rate ?? 0) - (b[1].agreement_rate ?? 0));
    const [checkId, value] = entries[0];
    return { checkId, agreement_rate: value.agreement_rate ?? 0 };
  })();

  const totalDocuments = typeof dashboardReport?.metrics?.total_documents === 'number'
    ? dashboardReport.metrics.total_documents
    : docs.length;
  const totalRuns = typeof dashboardReport?.metrics?.total_runs === 'number'
    ? dashboardReport.metrics.total_runs
    : 0;
  const averageJudgeScore = typeof dashboardReport?.metrics?.average_score === 'number'
    ? dashboardReport.metrics.average_score
    : 0;
  const flaggedOutputs = typeof dashboardReport?.metrics?.flagged_outputs === 'number'
    ? dashboardReport.metrics.flagged_outputs
    : 0;
  const reviewAgree = typeof dashboardReport?.agreement?.agree === 'number' ? dashboardReport.agreement.agree : 0;
  const reviewDisagree = typeof dashboardReport?.agreement?.disagree === 'number' ? dashboardReport.agreement.disagree : 0;
  const reviewFlag = typeof dashboardReport?.agreement?.flag === 'number' ? dashboardReport.agreement.flag : 0;

  // Helper to extract run results into a dictionary for easier comparison
  const getRunChecksMap = (run: Run | null) => {
    if (!run) return {};
    const map: Record<string, { result: string; score: number }> = {};
    run.checks?.forEach((c) => {
      map[c.check_id] = {
        result: c.judge_assessment?.verdict || 'Unknown',
        score: c.judge_assessment?.score || 0
      };
    });
    return map;
  };

  const resultsA = getRunChecksMap(selectedRunA);
  const resultsB = getRunChecksMap(selectedRunB);

  // Get unique checks involved in either run
  const allCheckIds = Array.from(new Set([
    ...Object.keys(resultsA),
    ...Object.keys(resultsB)
  ])).sort();

  const handleCompare = () => {
    setShowComparison(true);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-linear-to-br from-indigo-700 to-indigo-900 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z" /></svg>
          </div>
          <div className="text-sm font-medium mb-2 opacity-90 relative z-10">Total Documents</div>
          <div className="text-3xl font-bold relative z-10">{totalDocuments}</div>
        </div>
        <div className="bg-linear-to-br from-purple-700 to-purple-900 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></svg>
          </div>
          <div className="text-sm font-medium mb-2 opacity-90 relative z-10">Total Runs</div>
          <div className="text-3xl font-bold relative z-10">{totalRuns}</div>
        </div>
        <div className="bg-linear-to-br from-fuchsia-700 to-fuchsia-900 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z" /></svg>
          </div>
          <div className="text-sm font-medium mb-2 opacity-90 relative z-10">Average Judge Score</div>
          <div className="text-3xl font-bold relative z-10">{averageJudgeScore.toFixed(1)}<span className="text-lg opacity-75">/5</span></div>
        </div>
        <div className="bg-linear-to-br from-violet-700 to-violet-900 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" /></svg>
          </div>
          <div className="text-sm font-medium mb-2 opacity-90 relative z-10">Flagged Reviews</div>
          <div className="text-3xl font-bold relative z-10">{flaggedOutputs}</div>
        </div>
      </div>

      <div className="bg-sidebar border border-border rounded-xl shadow-sm mb-10 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Human Review Agreement (Run-Level)</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-background border border-border rounded-lg px-4 py-3">
            <div className="text-xs text-muted-foreground">Agree</div>
            <div className="text-2xl font-bold text-emerald-500">{reviewAgree}</div>
          </div>
          <div className="bg-background border border-border rounded-lg px-4 py-3">
            <div className="text-xs text-muted-foreground">Disagree</div>
            <div className="text-2xl font-bold text-rose-500">{reviewDisagree}</div>
          </div>
          <div className="bg-background border border-border rounded-lg px-4 py-3">
            <div className="text-xs text-muted-foreground">Flag</div>
            <div className="text-2xl font-bold text-amber-500">{reviewFlag}</div>
          </div>
        </div>
      </div>

      {/* Run Comparison */}
      <h2 className="text-2xl font-bold tracking-tight mb-6">Compare Runs</h2>
      <div className="bg-sidebar border border-border rounded-xl shadow-sm mb-10 p-6">
        {/* Dynamic Run Selectors */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6 min-w-0">
          <div className="flex-1 min-w-0">
            <RunSelector 
               label="Run A" 
               docs={docs} 
               selectedRun={selectedRunA} 
               disabledRunId={selectedRunB?.run_id || null} 
               onSelectRun={setSelectedRunA} 
            />
          </div>
          <div className="flex-1 min-w-0">
            <RunSelector 
               label="Run B" 
               docs={docs} 
               selectedRun={selectedRunB} 
               disabledRunId={selectedRunA?.run_id || null} 
               onSelectRun={setSelectedRunB} 
            />
          </div>
        </div>

        <div className="flex justify-end mb-6">
          <button
            onClick={handleCompare}
            disabled={!selectedRunA || !selectedRunB}
            className="px-8 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-2"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Compare Results
          </button>
        </div>

        {showComparison ? (
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-sm text-left min-w-150">
              <thead className="bg-background border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-semibold">Check</th>
                  <th className="px-6 py-4 font-semibold">Run A Result</th>
                  <th className="px-6 py-4 font-semibold">Run B Result</th>
                  <th className="px-6 py-4 font-semibold">Δ Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-sidebar">
                {allCheckIds.map((check) => {
                  const scoreA = resultsA[check]?.score || 0;
                  const scoreB = resultsB[check]?.score || 0;
                  const resA = resultsA[check]?.result || 'N/A';
                  const resB = resultsB[check]?.result || 'N/A';

                  const delta = scoreA - scoreB;

                  return (
                    <tr key={check} className="hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">{check}</td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${resA === 'Pass' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {resA}
                        </span>
                        <span className="text-muted-foreground ml-2">({scoreA.toFixed(1)})</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${resB === 'Pass' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {resB}
                        </span>
                        <span className="text-muted-foreground ml-2">({scoreB.toFixed(1)})</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold text-[15px] flex items-center gap-1 ${delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                          {delta > 0 && <ArrowUp className="w-4 h-4" />}
                          {delta < 0 && <ArrowDown className="w-4 h-4" />}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border-2 border-dashed border-border rounded-xl p-10 text-center flex items-center justify-center bg-background/50 min-h-50">
            <p className="text-muted-foreground font-medium">Click &quot;Compare&quot; to view side-by-side table: Check | Run A Result | Run B Result | Δ Score</p>
          </div>
        )}
      </div>


      {/* Judge Performance Evaluation */}
      <h2 className="text-2xl font-bold tracking-tight mb-6">Judge Performance Evaluation</h2>
      <div className="bg-sidebar border border-border rounded-xl shadow-sm p-6 mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-medium text-foreground flex items-center">
            Ground Truth Benchmark (Baseline-Level)
            <InfoTooltip title="Judge Performance Evaluation (Benchmark)">
              <p className="mb-2">Quantifies how closely the LLM-as-a-judge approximates human performance by comparing verdicts against imported Ground Truth baselines.</p>
              <p className="mb-2"><strong>Formula:</strong> Agreement Rate = Correct Verdicts / Total Benchmarked Checks.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Agreement Rate:</strong> The percentage of checks where the AI verdict matched the human outcome.</li>
                <li><strong>False Positives/Negatives:</strong> Situations where the AI incorrectly passed or failed a check.</li>
                <li><strong>Mismatches Table:</strong> Use it to identify recurring failure patterns per check and tune prompts/rubrics.</li>
                <li><strong>Interpretation Tip:</strong> High agreement with very low sample size can be noisy; always read it with Total Benchmarked Checks.</li>
              </ul>
            </InfoTooltip>
          </h3>
          <button
            onClick={handleRunBenchmark}
            disabled={isBenchmarking}
            className="px-6 py-2.5 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-2"
          >
            {isBenchmarking ? <Spinner size="sm" className="text-white" /> : <Play className="w-4 h-4" fill="currentColor" />}
            {isBenchmarking ? 'Running Benchmark...' : 'Run Benchmark'}
          </button>
        </div>

        {!benchmarkResult && !isBenchmarking && (
          <div className="border-2 border-dashed border-border rounded-xl p-8 bg-background/50 flex flex-col items-center justify-center text-center min-h-50">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <h4 className="font-semibold text-foreground text-lg mb-2">No Benchmark Data Yet</h4>
            <p className="text-muted-foreground max-w-md">
              Run the benchmark to evaluate the current LLM configuration against your Ground Truth Baselines.
            </p>
          </div>
        )}

        {isBenchmarking && (
          <div className="border-2 border-dashed border-border rounded-xl p-12 bg-background/50 flex flex-col items-center justify-center text-center min-h-50">
            <Spinner size="lg" className="mb-4" />
            <p className="text-muted-foreground font-medium animate-pulse">Running live LLM evaluation... This might take a minute.</p>
          </div>
        )}

        {benchmarkResult && !isBenchmarking && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Score Card */}
              <div className="bg-background border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-emerald-400 to-emerald-600"></div>
                <div className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Global Agreement Rate</div>
                <div className={`text-5xl font-black mb-1 ${benchmarkResult.agreement_rate >= 90 ? 'text-emerald-500' : benchmarkResult.agreement_rate >= 80 ? 'text-amber-500' : 'text-rose-500'}`}>
                  {benchmarkResult.agreement_rate.toFixed(1)}%
                </div>
                <div className="text-sm text-foreground/80 font-medium">accuracy vs human experts</div>
              </div>

              {/* Stats Card */}
              <div className="bg-background border border-border rounded-xl p-6 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-border/50">
                  <div className="text-muted-foreground font-medium">Total Benchmarked Checks</div>
                  <div className="text-2xl font-bold text-foreground">{benchmarkResult.total}</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-muted-foreground font-medium">Correct Verdicts</div>
                  <div className="text-2xl font-bold text-emerald-500 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> {benchmarkResult.correct}
                  </div>
                </div>
              </div>

              {/* Error Types */}
              <div className="bg-background border border-border rounded-xl p-6 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-border/50">
                  <div className="text-muted-foreground font-medium">Mismatches</div>
                  <div className="text-2xl font-bold text-rose-500">{benchmarkResult.total - benchmarkResult.correct}</div>
                </div>
                <div className="text-xs text-muted-foreground italic">
                  Review individual mismatch details below to spot formatting or strictness issues in the Judge configuration.
                </div>
              </div>
            </div>

            {/* Error Details Table (only show if there are mismatches) */}
            {benchmarkResult.details && benchmarkResult.details.some((detail) => !detail.is_correct) && (
              <div className="mt-8 border border-border rounded-xl overflow-hidden">
                <div className="bg-sidebar px-4 py-3 border-b border-border">
                  <h4 className="font-semibold text-rose-500 flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Benchmark Mismatches
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-background/50 text-xs uppercase text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Check ID</th>
                        <th className="px-4 py-3 font-semibold">Expected (Human)</th>
                        <th className="px-4 py-3 font-semibold">LLM Verdict</th>
                        <th className="px-4 py-3 font-semibold">Classification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-sidebar/30">
                      {benchmarkResult.details.filter((detail) => !detail.is_correct).map((detail, i) => (
                        <tr key={i} className="hover:bg-sidebar transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{detail.check_id}</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-semibold">{detail.expected_outcome}</span></td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-semibold">{detail.actual_verdict}</span></td>
                          <td className="px-4 py-3 text-muted-foreground">{detail.actual_classification}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold tracking-tight mb-6">Trends & Analysis</h2>

      {/* Agreement Metrics */}
      <div className="bg-sidebar border border-border rounded-xl shadow-sm mb-8 p-6">
        <h3 className="text-lg font-medium text-foreground mb-6 flex items-center">
          Agreement Metrics Over Time
          <InfoTooltip title="Agreement Metrics">
            <p className="mb-2">Tracks how often the LLM judge matches human evaluators across benchmark snapshots.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Overall Agreement:</strong> Latest snapshot score (current calibration status).</li>
              <li><strong>Delta vs Previous:</strong> Direction and magnitude of change compared to the prior benchmark.</li>
              <li><strong>Most Disagreed Check:</strong> The lowest per-check agreement, useful for prioritizing remediation.</li>
              <li><strong>Benchmarks Run:</strong> Number of snapshots; more runs increase trend reliability.</li>
            </ul>
          </InfoTooltip>
        </h3>
        <div className="h-75 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={agreementData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e5e7eb' : '#334155'} vertical={false} />
              <XAxis dataKey="date" stroke={isLight ? '#6b7280' : '#94a3b8'} fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke={isLight ? '#6b7280' : '#94a3b8'} fontSize={12} tickLine={false} axisLine={false} dx={-10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isLight ? '#ffffff' : '#1e1e24',
                  borderRadius: '8px',
                  border: isLight ? '1px solid #e5e7eb' : '1px solid #334155',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="agreement" name="Judge vs Human Agreement (%)" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-background border border-border p-5 rounded-xl">
            <div className="text-sm font-medium text-muted-foreground mb-1">Overall Agreement</div>
            <div className="text-3xl font-bold text-emerald-500 mb-2">{latestAgreement !== null ? `${latestAgreement.toFixed(1)}%` : 'N/A'}</div>
            <div className={`text-sm flex items-center gap-1 font-medium ${deltaAgreement === null ? 'text-muted-foreground' : deltaAgreement >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {deltaAgreement === null ? (
                <>Need at least 2 benchmarks</>
              ) : (
                <>
                  {deltaAgreement >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  {`${deltaAgreement >= 0 ? '+' : ''}${deltaAgreement.toFixed(1)}% vs previous benchmark`}
                </>
              )}
            </div>
          </div>
          <div className="bg-background border border-border p-5 rounded-xl">
            <div className="text-sm font-medium text-muted-foreground mb-1">Most Disagreed Check</div>
            <div className="text-lg font-bold text-rose-500 leading-tight mb-2">{leastAgreeingCheck ? leastAgreeingCheck.checkId : 'N/A'}</div>
            <div className="text-sm text-muted-foreground">{leastAgreeingCheck ? `${leastAgreeingCheck.agreement_rate.toFixed(1)}% agreement` : 'Run benchmark to populate'}</div>
          </div>
          <div className="bg-background border border-border p-5 rounded-xl">
            <div className="text-sm font-medium text-muted-foreground mb-1">Benchmarks Run</div>
            <div className="text-3xl font-bold text-primary mb-2">{benchmarkHistory.length}</div>
            <div className="text-sm text-muted-foreground">stored calibration snapshots</div>
          </div>
        </div>
      </div>
      <NoticeDialog
        isOpen={notice.isOpen}
        title={notice.title}
        message={notice.message}
        onClose={() => setNotice(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
