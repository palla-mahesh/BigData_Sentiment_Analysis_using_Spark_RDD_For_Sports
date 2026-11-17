import React, { useState } from 'react';
import { CheckCircle2, FileText, Play, Sparkles, Upload } from 'lucide-react';
import {
  previewSentiment,
  runBatchSparkAnalysis,
  runSingleSparkAnalysis,
  uploadFileSparkAnalysis,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { SparkJobProgressEvent, SportWithStats } from '../types/analytics';

interface SentimentWorkbenchPageProps {
  sports: SportWithStats[];
  liveJob: SparkJobProgressEvent | null;
  onJobCompleted: () => void;
}

export function SentimentWorkbenchPage({
  sports,
  liveJob,
  onJobCompleted,
}: SentimentWorkbenchPageProps) {
  const { dbUser, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'single' | 'batch' | 'file'>('single');
  const [sportSlug, setSportSlug] = useState<string>('cricket');
  const [singleText, setSingleText] = useState(
    'Unbelievable death bowling yorker spell! The captain strategy and execution were a complete masterclass!',
  );
  const [batchText, setBatchText] = useState(
    'Brilliant unbeaten century under pressure, historic team victory!\nSloppy fielding and dropped catches ruined a strong bowling effort.\nBalanced contest with steady bowling and disciplined batting.',
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [rddSummary, setRddSummary] = useState<any | null>(null);

  const handlePreviewOnly = async () => {
    setError(null);
    setStatusMessage(null);
    setSubmitting(true);
    try {
      const analysis = await previewSentiment(singleText);
      setAnalysisResult(analysis);
      setRddSummary(null);
      setStatusMessage('Deterministic NLP preview computed (not saved to PostgreSQL yet).');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunPersistentSingle = async () => {
    setError(null);
    setStatusMessage(null);
    if (!dbUser) {
      setError('Sign in with Google to persist Spark RDD analysis jobs to PostgreSQL.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await runSingleSparkAnalysis(singleText, sportSlug);
      setAnalysisResult(res.results?.[0] || null);
      setRddSummary(res.rddSummary || null);
      setStatusMessage(`Spark RDD job ${res.job.jobUid} persisted to Cloud SQL PostgreSQL.`);
      onJobCompleted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunBatch = async () => {
    setError(null);
    setStatusMessage(null);
    if (!dbUser) {
      setError('Sign in with Google to run and persist Spark RDD batch jobs.');
      return;
    }
    const lines = batchText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 4);
    if (lines.length === 0) {
      setError('Enter at least one valid comment line.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await runBatchSparkAnalysis(lines, sportSlug, 'manual-entry');
      setAnalysisResult(res.results?.[0] || null);
      setRddSummary(res.rddSummary || null);
      setStatusMessage(
        `Spark RDD batch job ${res.job.jobUid} analyzed ${res.job.processedRecords} comments in ${res.job.durationMs}ms.`,
      );
      onJobCompleted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async () => {
    setError(null);
    setStatusMessage(null);
    if (!dbUser) {
      setError('Sign in with Google to upload CSV/TXT datasets into PostgreSQL.');
      return;
    }
    if (!selectedFile) {
      setError('Select a .csv or .txt file first.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await uploadFileSparkAnalysis(selectedFile, sportSlug);
      setAnalysisResult(res.results?.[0] || null);
      setRddSummary(res.rddSummary || null);
      setStatusMessage(
        `Uploaded ${selectedFile.name}: ${res.job.processedRecords} records processed by Spark RDD in ${res.job.durationMs}ms.`,
      );
      onJobCompleted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Sentiment Analysis & Spark RDD Workbench
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Analyze single opinions, paste multi-line comments, or upload CSV/TXT corpora through our deterministic sports NLP pipeline.
          </p>
        </div>

        {!dbUser && (
          <button
            type="button"
            onClick={signInWithGoogle}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer"
          >
            Sign In to Persist Batch Jobs
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input & Mode Controls */}
        <div className="lg:col-span-6 rounded-xl border border-slate-800/80 bg-[#0B1324] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-[#070E1E] p-1 border border-slate-800">
              {([
                ['single', 'Single Comment'],
                ['batch', 'Paste Multiple'],
                ['file', 'Upload CSV / TXT'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    mode === key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              value={sportSlug}
              onChange={(e) => setSportSlug(e.target.value)}
              aria-label="Select Sport"
              className="rounded-lg border border-slate-700 bg-[#070E1E] px-3 py-1.5 text-xs font-medium text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {(sports.length > 0
                ? sports
                : [
                    { slug: 'cricket', name: 'Cricket' },
                    { slug: 'football', name: 'Football' },
                    { slug: 'basketball', name: 'Basketball' },
                    { slug: 'tennis', name: 'Tennis' },
                    { slug: 'hockey', name: 'Hockey' },
                    { slug: 'formula-1', name: 'Formula 1' },
                    { slug: 'kabaddi', name: 'Kabaddi' },
                    { slug: 'esports', name: 'Esports' },
                  ]
              ).map((sp) => (
                <option key={sp.slug} value={sp.slug}>
                  {sp.name}
                </option>
              ))}
            </select>
          </div>

          {mode === 'single' && (
            <div className="space-y-4">
              <label className="block text-xs font-medium text-slate-300">
                Enter sports comment or match opinion
                <textarea
                  rows={5}
                  value={singleText}
                  onChange={(e) => setSingleText(e.target.value)}
                  placeholder="Type or paste a sports fan comment..."
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-[#070E1E] p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handlePreviewOnly}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#111C33] px-4 py-2.5 text-xs font-semibold text-slate-100 hover:border-cyan-500/60 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Instant NLP Preview
                </button>
                <button
                  type="button"
                  onClick={handleRunPersistentSingle}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Play className="w-3.5 h-3.5" />
                  Run Spark RDD & Save
                </button>
              </div>
            </div>
          )}

          {mode === 'batch' && (
            <div className="space-y-4">
              <label className="block text-xs font-medium text-slate-300">
                Paste multiple comments (one per line, up to 500 lines)
                <textarea
                  rows={7}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-[#070E1E] p-3.5 text-xs font-mono-tabular text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </label>
              <button
                type="button"
                onClick={handleRunBatch}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer disabled:opacity-60"
              >
                <Play className="w-3.5 h-3.5" />
                Execute Spark RDD Batch Job
              </button>
            </div>
          )}

          {mode === 'file' && (
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-[#070E1E] p-8 text-center cursor-pointer hover:border-blue-500/60 transition-colors">
                <Upload className="w-7 h-7 text-blue-400 mb-2" />
                <span className="text-sm font-medium text-slate-200">
                  {selectedFile ? selectedFile.name : 'Choose a .CSV or .TXT sports dataset'}
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  Max 2 MB · Up to 500 comment rows per Spark RDD job
                </span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </label>

              <button
                type="button"
                onClick={handleFileUpload}
                disabled={submitting || !selectedFile}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5" />
                Ingest & Process Dataset
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200">
              {error}
            </div>
          )}
          {statusMessage && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-3 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {liveJob && (
            <div className="rounded-lg border border-slate-800 bg-[#070E1E] p-3.5">
              <div className="flex items-center justify-between text-xs text-cyan-300">
                <span>Live SSE Stream · {liveJob.jobUid}</span>
                <span className="font-mono-tabular">{liveJob.progress}%</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{liveJob.stage}</p>
            </div>
          )}
        </div>

        {/* Right: Detailed NLP & Spark RDD Output Panel */}
        <div className="lg:col-span-6 rounded-xl border border-slate-800/80 bg-[#0B1324] p-6 space-y-5">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Detailed Analysis & RDD Output
            </h2>
            <p className="text-xs text-slate-400">
              Classification polarity, confidence, emotions, keywords, and aspect scores.
            </p>
          </div>

          {!analysisResult ? (
            <div className="h-[340px] rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-sm font-medium text-slate-300">Ready to Analyze</p>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                Click Instant NLP Preview or Execute Spark RDD to inspect deterministic token weights, emotions, and aspect extraction.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-800 bg-[#070E1E] p-3.5">
                  <p className="text-[11px] text-slate-400">Polarity</p>
                  <p
                    className={`mt-1 font-display text-lg font-bold ${
                      analysisResult.polarity === 'POSITIVE'
                        ? 'text-emerald-400'
                        : analysisResult.polarity === 'NEGATIVE'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                    }`}
                  >
                    {analysisResult.polarity}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#070E1E] p-3.5">
                  <p className="text-[11px] text-slate-400">Score (-100..+100)</p>
                  <p className="mt-1 font-mono-tabular text-lg font-bold text-cyan-300">
                    {analysisResult.score > 0 ? `+${analysisResult.score}` : analysisResult.score}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#070E1E] p-3.5">
                  <p className="text-[11px] text-slate-400">Confidence</p>
                  <p className="mt-1 font-mono-tabular text-lg font-bold text-white">
                    {Math.round((analysisResult.confidence || 0.7) * 100)}%
                  </p>
                </div>
              </div>

              {/* Emotions */}
              <div>
                <p className="text-xs font-semibold text-slate-300 mb-2">
                  Detected Emotions · Dominant: {analysisResult.emotions?.dominantEmotion}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(['joy', 'excitement', 'surprise', 'fear', 'sadness', 'anger'] as const).map((emo) => (
                    <div key={emo} className="rounded-lg border border-slate-800 bg-[#070E1E] px-3 py-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize text-slate-300">{emo}</span>
                        <span className="font-mono-tabular text-cyan-300">
                          {analysisResult.emotions?.[emo] ?? 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Keywords & Matched Lexicon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-300 mb-2">Extracted Keywords</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {(analysisResult.keywords || [])
                      .map((k: any) => `${k.keyword} (${k.weight})`)
                      .join(' · ') || 'None'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-300 mb-2">Matched Lexicon Cues</p>
                  <p className="text-xs font-mono-tabular text-cyan-300 leading-relaxed">
                    {(analysisResult.matchedTokens || []).join(' · ') || 'Neutral baseline'}
                  </p>
                </div>
              </div>

              {/* Aspects */}
              <div>
                <p className="text-xs font-semibold text-slate-300 mb-2">Identified Sports Aspects</p>
                <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-[#070E1E]">
                  {(analysisResult.aspects || []).map((asp: any) => (
                    <div key={asp.aspectName} className="flex items-center justify-between px-3.5 py-2 text-xs">
                      <span className="font-medium text-slate-200">{asp.aspectName}</span>
                      <span className="font-mono-tabular text-slate-400">
                        {asp.polarity} · Score {asp.score > 0 ? `+${asp.score}` : asp.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* RDD Stage Metrics when persisted */}
              {rddSummary?.stageMetrics && (
                <div>
                  <p className="text-xs font-semibold text-slate-300 mb-2">
                    Spark RDD Stage Execution ({rddSummary.partitions} partitions)
                  </p>
                  <div className="space-y-1.5 text-[11px] font-mono-tabular text-slate-400">
                    {rddSummary.stageMetrics.map((st: any) => (
                      <div key={st.stage} className="flex items-center justify-between">
                        <span>{st.operation}</span>
                        <span>
                          {st.inputCount} → {st.outputCount} ({st.durationMs}ms)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
