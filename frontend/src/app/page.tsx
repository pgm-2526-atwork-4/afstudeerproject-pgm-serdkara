"use client"

import Link from 'next/link';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from 'next-themes';
import { ArrowRight, ArrowUp, ArrowDown, CheckCircle2, ChevronLeft, ChevronRight, FileText, Activity, Play, CheckCircle, XCircle } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { Spinner } from '@/components/ui/Spinner';

const mockDocs = [
  { id: 'doc1', name: 'InfoSec_Policy_v3.2.pdf' },
  { id: 'doc2', name: 'Access_Control_Doc.pdf' },
  { id: 'doc3', name: 'InfoSec_Policy_v3.1.pdf' },
  { id: 'doc4', name: 'Acceptable_Use_Policy.pdf' },
  { id: 'doc5', name: 'Data_Retention_Policy.pdf' },
];

const mockRunsByDoc: Record<string, { id: string, date: string }[]> = {
  'doc1': [
    { id: 'RUN-001', date: '2026-02-14 10:30' },
    { id: 'RUN-004', date: '2026-02-13 14:20' },
    { id: 'RUN-007', date: '2026-02-12 09:15' },
    { id: 'RUN-010', date: '2026-02-11 11:00' },
  ],
  'doc2': [
    { id: 'RUN-002', date: '2026-02-14 11:00' },
    { id: 'RUN-005', date: '2026-02-13 09:00' },
    { id: 'RUN-008', date: '2026-02-12 15:30' },
    { id: 'RUN-011', date: '2026-02-11 16:45' },
  ],
  'doc3': [
    { id: 'RUN-003', date: '2026-02-14 12:30' },
    { id: 'RUN-006', date: '2026-02-13 10:20' },
    { id: 'RUN-009', date: '2026-02-12 11:15' },
    { id: 'RUN-012', date: '2026-02-11 13:00' },
  ],
  'doc4': [
    { id: 'RUN-013', date: '2026-02-15 10:00' },
  ],
  'doc5': [
    { id: 'RUN-014', date: '2026-02-15 11:00' },
  ]
};

function RunSelector({ label, selectedRun, onSelectRun }: { label: string, selectedRun: string | null, onSelectRun: (runId: string) => void }) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const [docPage, setDocPage] = useState(0);
  const [runPage, setRunPage] = useState(0);

  const ITEMS_PER_PAGE = 3;

  const totalDocPages = Math.ceil(mockDocs.length / ITEMS_PER_PAGE);
  const visibleDocs = mockDocs.slice(docPage * ITEMS_PER_PAGE, (docPage + 1) * ITEMS_PER_PAGE);

  const runsForDoc = selectedDocId ? (mockRunsByDoc[selectedDocId] || []) : [];
  const totalRunPages = Math.ceil(runsForDoc.length / ITEMS_PER_PAGE);
  const visibleRuns = runsForDoc.slice(runPage * ITEMS_PER_PAGE, (runPage + 1) * ITEMS_PER_PAGE);

  const handleDocSelect = (docId: string) => {
    setSelectedDocId(docId);
    setRunPage(0); // reset run pagination
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
        <div className="space-y-1.5 min-h-[140px]">
          {visibleDocs.map(doc => (
            <button
              key={doc.id}
              onClick={() => handleDocSelect(doc.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border ${selectedDocId === doc.id ? 'bg-primary/10 border-primary/40 text-primary font-medium shadow-[0_0_10px_rgba(139,92,246,0.1)]' : 'border-border/40 bg-sidebar hover:border-border hover:bg-white/[0.02] text-foreground'}`}
            >
              <div className="flex items-center gap-2 max-w-full">
                <FileText className={`w-4 h-4 flex-shrink-0 ${selectedDocId === doc.id ? 'text-primary' : 'text-muted-foreground'}`} />
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
        <div className="space-y-1.5 min-h-[140px]">
          {visibleRuns.map(run => (
            <button
              key={run.id}
              onClick={() => onSelectRun(run.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border flex justify-between items-center ${selectedRun === run.id ? 'bg-primary/10 border-primary/40 text-primary font-medium shadow-[0_0_10px_rgba(139,92,246,0.1)]' : 'border-border/40 bg-sidebar hover:border-border hover:bg-white/[0.02] text-foreground'}`}
            >
              <span className="font-mono truncate">{run.id}</span>
              <span className={`text-xs flex-shrink-0 ml-2 ${selectedRun === run.id ? 'text-primary' : 'text-muted-foreground'}`}>{run.date}</span>
            </button>
          ))}
          {selectedDocId && visibleRuns.length === 0 && <div className="text-xs text-muted-foreground p-3 text-center border border-dashed border-border rounded-lg bg-sidebar/50">No runs found for this document.</div>}
          {!selectedDocId && <div className="text-xs text-muted-foreground p-3 text-center border border-dashed border-border rounded-lg bg-sidebar/50">Select a document first.</div>}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { theme, resolvedTheme } = useTheme();
  const [selectedRunA, setSelectedRunA] = useState('RUN-001');
  const [selectedRunB, setSelectedRunB] = useState('RUN-003');
  const [showComparison, setShowComparison] = useState(false);

  // Benchmarking State
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<any>(null);

  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    try {
      const res = await fetch('http://localhost:5000/api/golden-set/benchmark', { method: 'POST' });
      const data = await res.json();
      setBenchmarkResult(data);
    } catch (e) {
      console.error(e);
      alert("Failed to run benchmark calibration.");
    } finally {
      setIsBenchmarking(false);
    }
  };

  const isLight = theme === 'system' ? resolvedTheme === 'light' : theme === 'light';

  // Sample data for the agreement metrics chart
  const agreementData = [
    { run: 'Run 1', agreement: 88, date: '02/01' },
    { run: 'Run 2', agreement: 90, date: '02/02' },
    { run: 'Run 3', agreement: 85, date: '02/03' },
    { run: 'Run 4', agreement: 89, date: '02/04' },
    { run: 'Run 5', agreement: 92, date: '02/05' },
    { run: 'Run 6', agreement: 91, date: '02/06' },
    { run: 'Run 7', agreement: 87, date: '02/07' },
    { run: 'Run 8', agreement: 93, date: '02/08' },
    { run: 'Run 9', agreement: 90, date: '02/09' },
    { run: 'Run 10', agreement: 89, date: '02/10' },
    { run: 'Run 11', agreement: 94, date: '02/11' },
    { run: 'Run 12', agreement: 92, date: '02/12' },
    { run: 'Run 13', agreement: 95, date: '02/13' },
  ];

  // Mock run results data
  const runResults: { [key: string]: { [check: string]: { result: 'Pass' | 'Fail', score: number } } } = {
    'RUN-001': {
      '9.1.1': { result: 'Pass', score: 4.5 },
      '9.1.2': { result: 'Pass', score: 4.2 },
      '9.1.3': { result: 'Fail', score: 2.8 },
      '10.1.1': { result: 'Pass', score: 4.7 },
      '10.1.2': { result: 'Pass', score: 4.3 },
      '10.1.3': { result: 'Pass', score: 3.9 },
      '11.1.1': { result: 'Pass', score: 4.8 },
      '11.1.2': { result: 'Pass', score: 4.6 },
      '11.1.3': { result: 'Fail', score: 2.5 },
    },
    'RUN-002': {
      '9.1.1': { result: 'Pass', score: 4.6 },
      '9.1.2': { result: 'Pass', score: 4.4 },
      '9.1.3': { result: 'Pass', score: 4.1 },
      '10.1.1': { result: 'Pass', score: 4.2 },
      '10.1.2': { result: 'Pass', score: 4.5 },
      '10.1.3': { result: 'Pass', score: 3.8 },
      '11.1.1': { result: 'Pass', score: 4.7 },
      '11.1.2': { result: 'Fail', score: 2.9 },
      '11.1.3': { result: 'Pass', score: 4.0 },
    },
    'RUN-003': {
      '9.1.1': { result: 'Pass', score: 4.3 },
      '9.1.2': { result: 'Fail', score: 2.7 },
      '9.1.3': { result: 'Pass', score: 3.8 },
      '10.1.1': { result: 'Pass', score: 4.5 },
      '10.1.2': { result: 'Pass', score: 4.1 },
      '10.1.3': { result: 'Fail', score: 2.6 },
      '11.1.1': { result: 'Pass', score: 4.9 },
      '11.1.2': { result: 'Pass', score: 4.4 },
      '11.1.3': { result: 'Fail', score: 2.4 },
    },
  };

  const checks = ['9.1.1', '9.1.2', '9.1.3', '10.1.1', '10.1.2', '10.1.3', '11.1.1', '11.1.2', '11.1.3'];

  const handleCompare = () => {
    setShowComparison(true);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z" /></svg>
          </div>
          <div className="text-sm font-medium mb-2 opacity-90 relative z-10">Total Documents</div>
          <div className="text-3xl font-bold relative z-10">42</div>
        </div>
        <div className="bg-gradient-to-br from-purple-700 to-purple-900 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></svg>
          </div>
          <div className="text-sm font-medium mb-2 opacity-90 relative z-10">Total Runs</div>
          <div className="text-3xl font-bold relative z-10">127</div>
        </div>
        <div className="bg-gradient-to-br from-fuchsia-700 to-fuchsia-900 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z" /></svg>
          </div>
          <div className="text-sm font-medium mb-2 opacity-90 relative z-10">Average Judge Score</div>
          <div className="text-3xl font-bold relative z-10">4.2<span className="text-lg opacity-75">/5</span></div>
        </div>
        <div className="bg-gradient-to-br from-violet-700 to-violet-900 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" /></svg>
          </div>
          <div className="text-sm font-medium mb-2 opacity-90 relative z-10">Flagged Outputs</div>
          <div className="text-3xl font-bold relative z-10">8</div>
        </div>
      </div>

      {/* Run Comparison */}
      <div className="bg-sidebar border border-border rounded-xl shadow-sm mb-10 p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Compare Runs</h3>

        {/* Dynamic Run Selectors */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          <RunSelector label="Run A" selectedRun={selectedRunA} onSelectRun={setSelectedRunA} />
          <RunSelector label="Run B" selectedRun={selectedRunB} onSelectRun={setSelectedRunB} />
        </div>

        <div className="flex justify-end mb-6">
          <button
            onClick={handleCompare}
            disabled={!selectedRunA || !selectedRunB}
            className="px-8 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-2"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Compare Results
          </button>
        </div>

        {showComparison ? (
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-sm text-left min-w-[600px]">
              <thead className="bg-background border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-semibold">Check</th>
                  <th className="px-6 py-4 font-semibold">Run A Result</th>
                  <th className="px-6 py-4 font-semibold">Run B Result</th>
                  <th className="px-6 py-4 font-semibold">Δ Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-sidebar">
                {checks.map((check) => {
                  const scoreA = runResults[selectedRunA][check]?.score || 0;
                  const scoreB = runResults[selectedRunB][check]?.score || 0;
                  const resA = runResults[selectedRunA][check]?.result || 'Unknown';
                  const resB = runResults[selectedRunB][check]?.result || 'Unknown';

                  const delta = scoreA - scoreB;

                  return (
                    <tr key={check} className="hover:bg-white/[0.02] transition-colors">
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
          <div className="border-2 border-dashed border-border rounded-xl p-10 text-center flex items-center justify-center bg-background/50 min-h-[200px]">
            <p className="text-muted-foreground font-medium">Click &quot;Compare&quot; to view side-by-side table: Check | Run A Result | Run B Result | Δ Score</p>
          </div>
        )}
      </div>


      {/* Judge Performance Evaluation */}
      <h2 className="text-2xl font-bold tracking-tight mb-6">Judge Performance Evaluation</h2>
      <div className="bg-sidebar border border-border rounded-xl shadow-sm p-6 mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-medium text-foreground flex items-center">
            Calibration Benchmark
            <InfoTooltip title="Judge Performance Evaluation (Calibration)">
              <p className="mb-2">Quantifies how closely the LLM-as-a-judge approximates human performance by comparing its verdicts against the Human Ground Truth (Golden Baselines) you imported.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Agreement Rate:</strong> The percentage of checks where the AI verdict matched the human outcome.</li>
                <li><strong>False Positives/Negatives:</strong> Situations where the AI incorrectly passed or failed a check.</li>
              </ul>
            </InfoTooltip>
          </h3>
          <button
            onClick={handleRunBenchmark}
            disabled={isBenchmarking}
            className="px-6 py-2.5 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-2"
          >
            {isBenchmarking ? <Spinner size="sm" className="text-white" /> : <Play className="w-4 h-4" fill="currentColor" />}
            {isBenchmarking ? 'Running Calibration...' : 'Run Benchmark Calibration'}
          </button>
        </div>

        {!benchmarkResult && !isBenchmarking && (
          <div className="border-2 border-dashed border-border rounded-xl p-8 bg-background/50 flex flex-col items-center justify-center text-center min-h-[200px]">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <h4 className="font-semibold text-foreground text-lg mb-2">No Calibration Data yet</h4>
            <p className="text-muted-foreground max-w-md">
              Run the benchmark calibration to evaluate the current LLM configuration against your Golden Baselines.
            </p>
          </div>
        )}

        {isBenchmarking && (
          <div className="border-2 border-dashed border-border rounded-xl p-12 bg-background/50 flex flex-col items-center justify-center text-center min-h-[200px]">
            <Spinner size="lg" className="mb-4" />
            <p className="text-muted-foreground font-medium animate-pulse">Running live LLM evaluation... This might take a minute.</p>
          </div>
        )}

        {benchmarkResult && !isBenchmarking && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Score Card */}
              <div className="bg-background border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                <div className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Global Agreement Rate</div>
                <div className={`text-5xl font-black mb-1 ${benchmarkResult.agreement_rate >= 90 ? 'text-emerald-500' : benchmarkResult.agreement_rate >= 80 ? 'text-amber-500' : 'text-rose-500'}`}>
                  {benchmarkResult.agreement_rate.toFixed(1)}%
                </div>
                <div className="text-sm text-foreground/80 font-medium">accuracy vs human experts</div>
              </div>

              {/* Stats Card */}
              <div className="bg-background border border-border rounded-xl p-6 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-border/50">
                  <div className="text-muted-foreground font-medium">Total Calibrated Checks</div>
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
            {benchmarkResult.details && benchmarkResult.details.some((d: any) => !d.is_correct) && (
              <div className="mt-8 border border-border rounded-xl overflow-hidden">
                <div className="bg-sidebar px-4 py-3 border-b border-border">
                  <h4 className="font-semibold text-rose-500 flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Calibration Mismatches
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
                      {benchmarkResult.details.filter((d: any) => !d.is_correct).map((detail: any, i: number) => (
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
            Tracks how often the LLM Judge&apos;s verdict matches human evaluators over time. High agreement indicates the LLM is reliably automating the review process according to your established ground truth.
          </InfoTooltip>
        </h3>
        <div className="h-[300px] w-full">
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
            <div className="text-3xl font-bold text-emerald-500 mb-2">91.3%</div>
            <div className="text-sm text-emerald-500 flex items-center gap-1 font-medium">
              <ArrowUp className="w-4 h-4" /> 2.1% from last week
            </div>
          </div>
          <div className="bg-background border border-border p-5 rounded-xl">
            <div className="text-sm font-medium text-muted-foreground mb-1">Most Disagreed Check</div>
            <div className="text-lg font-bold text-rose-500 leading-tight mb-2">10.1.3 Access Reviews</div>
            <div className="text-sm text-muted-foreground">73% agreement locally</div>
          </div>
          <div className="bg-background border border-border p-5 rounded-xl">
            <div className="text-sm font-medium text-muted-foreground mb-1">Avg Review Time</div>
            <div className="text-3xl font-bold text-primary mb-2">4.2 min</div>
            <div className="text-sm text-muted-foreground">per check</div>
          </div>
        </div>
      </div>
    </div>
  );
}
