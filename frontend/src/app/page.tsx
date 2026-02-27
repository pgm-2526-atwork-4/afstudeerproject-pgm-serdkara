"use client"

import Link from 'next/link';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from 'next-themes';
import { ArrowRight, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

export default function Dashboard() {
  const { theme, resolvedTheme } = useTheme();
  const [selectedRunA, setSelectedRunA] = useState('RUN-001');
  const [selectedRunB, setSelectedRunB] = useState('RUN-003');
  const [showComparison, setShowComparison] = useState(false);

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z" /></svg>
          </div>
          <div className="text-sm font-medium mb-2 opacity-90 relative z-10">Total Documents</div>
          <div className="text-3xl font-bold relative z-10">42</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-fuchsia-600 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></svg>
          </div>
          <div className="text-sm font-medium mb-2 opacity-90 relative z-10">Total Runs</div>
          <div className="text-3xl font-bold relative z-10">127</div>
        </div>
        <div className="bg-gradient-to-br from-fuchsia-500 to-pink-600 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z" /></svg>
          </div>
          <div className="text-sm font-medium mb-2 opacity-90 relative z-10">Average Judge Score</div>
          <div className="text-3xl font-bold relative z-10">4.2<span className="text-lg opacity-75">/5</span></div>
        </div>
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" /></svg>
          </div>
          <div className="text-sm font-medium mb-2 opacity-90 relative z-10">Flagged Outputs</div>
          <div className="text-3xl font-bold relative z-10">8</div>
        </div>
      </div>

      {/* Recent Runs Table */}
      <div className="bg-sidebar border border-border rounded-xl shadow-sm mb-10 overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-lg font-bold">Recent Runs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-sidebar/50 border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Run ID</th>
                <th className="px-6 py-4 font-medium">Document</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Results</th>
                <th className="px-6 py-4 font-medium">Agreement</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {[
                { id: 'RUN-023', doc: 'Policy_v2.pdf', date: '2026-02-13', pass: 12, fail: 3, agreement: '89%' },
                { id: 'RUN-022', doc: 'Security_Policy.pdf', date: '2026-02-12', pass: 15, fail: 0, agreement: '92%' },
                { id: 'RUN-021', doc: 'Compliance_Doc.pdf', date: '2026-02-11', pass: 10, fail: 2, agreement: '85%' },
                { id: 'RUN-020', doc: 'Policy_v1.pdf', date: '2026-02-10', pass: 14, fail: 1, agreement: '91%' }
              ].map((run) => (
                <tr key={run.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-semibold text-foreground">{run.id}</td>
                  <td className="px-6 py-4 text-muted-foreground">{run.doc}</td>
                  <td className="px-6 py-4 text-muted-foreground">{run.date}</td>
                  <td className="px-6 py-4">
                    <span className="text-emerald-500 font-semibold">{run.pass} Pass</span> <span className="text-muted-foreground mx-1">/</span> <span className="text-rose-500 font-semibold">{run.fail} Fail</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {run.agreement}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href="/runs/results"
                      className="text-primary hover:text-primary/80 font-semibold text-sm flex items-center gap-1 group"
                    >
                      View Details <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

      {/* Run Comparison */}
      <div className="bg-sidebar border border-border rounded-xl shadow-sm mb-8 p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">Compare Runs</h3>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-muted-foreground mb-2">Run A</label>
            <select
              value={selectedRunA}
              onChange={(e) => setSelectedRunA(e.target.value)}
              className="w-full bg-background border border-border text-foreground rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="RUN-001">RUN-001 - InfoSec_Policy_v3.2.pdf</option>
              <option value="RUN-002">RUN-002 - Access_Control_Doc.pdf</option>
              <option value="RUN-003">RUN-003 - InfoSec_Policy_v3.1.pdf</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-muted-foreground mb-2">Run B</label>
            <select
              value={selectedRunB}
              onChange={(e) => setSelectedRunB(e.target.value)}
              className="w-full bg-background border border-border text-foreground rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="RUN-003">RUN-003 - InfoSec_Policy_v3.1.pdf</option>
              <option value="RUN-001">RUN-001 - InfoSec_Policy_v3.2.pdf</option>
              <option value="RUN-002">RUN-002 - Access_Control_Doc.pdf</option>
            </select>
          </div>
          <div className="md:self-end">
            <button
              onClick={handleCompare}
              className="w-full md:w-auto px-8 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold shadow-sm transition-colors"
            >
              Compare
            </button>
          </div>
        </div>

        {showComparison ? (
          <div className="overflow-hidden border border-border rounded-xl">
            <table className="w-full text-sm text-left">
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

      {/* Golden Baseline */}
      <div className="bg-sidebar border border-border rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
          Golden Baseline Tracking
          <InfoTooltip title="Golden Baseline Tracking">
            <p className="mb-2">Identifies <strong>&quot;drift&quot;</strong> in LLM performance by comparing new runs against a designated &quot;Golden Baseline&quot; run.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Regression:</strong> A check that previously passed in the baseline now fails. Indicates the model lost accuracy.</li>
              <li><strong>Improvement:</strong> A check that previously failed now passes. Indicates your prompt tweaks were successful.</li>
            </ul>
          </InfoTooltip>
        </h3>

        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${isLight ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-amber-500/10 border border-amber-500/20 text-amber-500'}`}>
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>
            <strong className="font-semibold">Current Baseline:</strong> RUN-005 - InfoSec_Policy_GOLD_v3.pdf (Set: 2026-02-01)
          </span>
        </div>

        <div className="border-2 border-dashed border-border rounded-xl p-8 bg-background/50">
          <div className="text-center text-muted-foreground font-medium mb-6">
            Compare recent runs vs. baseline to identify grading drift
          </div>

          <div className="space-y-3 max-w-3xl mx-auto">
            <div className="p-4 bg-sidebar border border-border rounded-lg text-sm flex items-center">
              <span className="font-bold text-foreground w-24">RUN-001:</span>
              <span className="text-emerald-500 font-semibold px-2 flex items-center gap-1"><ArrowUp className="w-4 h-4" /> 2 new passes</span>,
              <span className="text-rose-500 font-semibold px-2 flex items-center gap-1"><ArrowDown className="w-4 h-4" /> 1 regression</span>
              <span className="text-muted-foreground ml-2">(Check 10.1.1)</span>
            </div>
            <div className="p-4 bg-sidebar border border-border rounded-lg text-sm flex items-center">
              <span className="font-bold text-foreground w-24">RUN-002:</span>
              <span className="text-muted-foreground px-2 italic">Different document (skip comparison)</span>
            </div>
            <div className="p-4 bg-sidebar border border-border rounded-lg text-sm flex items-center">
              <span className="font-bold text-foreground w-24">RUN-003:</span>
              <span className="text-rose-500 font-semibold px-2 flex items-center gap-1"><ArrowDown className="w-4 h-4" /> 2 regressions</span>
              <span className="text-muted-foreground ml-2">(Checks 9.1.2, 11.1.3)</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button className="px-6 py-2.5 border border-primary text-primary hover:bg-primary hover:text-white rounded-lg font-semibold transition-colors">
            Set New Baseline
          </button>
        </div>
      </div>
    </div>
  );
}
