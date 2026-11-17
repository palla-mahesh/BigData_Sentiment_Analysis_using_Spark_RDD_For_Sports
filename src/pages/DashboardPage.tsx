import React from 'react';
import {
  Activity,
  Award,
  Flame,
  MessageSquare,
  RefreshCw,
  Smile,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { SentimentShowcase3D } from '../three/SentimentShowcase3D';
import {
  AnalyticsBundle,
  AppView,
  SparkJobProgressEvent,
} from '../types/analytics';

interface DashboardPageProps {
  bundle: AnalyticsBundle | null;
  loading: boolean;
  liveJob: SparkJobProgressEvent | null;
  onRefresh: () => void;
  onNavigate: (view: AppView, sportSlug?: string) => void;
}

export function DashboardPage({
  bundle,
  loading,
  liveJob,
  onRefresh,
  onNavigate,
}: DashboardPageProps) {
  const kpis = bundle?.kpis;

  const kpiCards = [
    {
      label: 'Total Comments Analyzed',
      value: kpis?.totalComments ?? 0,
      decimals: 0,
      suffix: '',
      sub: 'Across 8 sports in PostgreSQL',
      icon: MessageSquare,
      tone: 'text-white',
    },
    {
      label: 'Positive Comments',
      value: kpis?.positiveCount ?? 0,
      decimals: 0,
      suffix: '',
      sub: `${kpis?.positivePct ?? 0}% of total volume`,
      icon: TrendingUp,
      tone: 'text-emerald-400',
    },
    {
      label: 'Negative Comments',
      value: kpis?.negativeCount ?? 0,
      decimals: 0,
      suffix: '',
      sub: `${kpis?.negativePct ?? 0}% of total volume`,
      icon: TrendingDown,
      tone: 'text-rose-400',
    },
    {
      label: 'Neutral Comments',
      value: kpis?.neutralCount ?? 0,
      decimals: 0,
      suffix: '',
      sub: `${kpis?.neutralPct ?? 0}% balanced opinions`,
      icon: Activity,
      tone: 'text-amber-400',
    },
    {
      label: 'Overall Sentiment Score',
      value: kpis?.overallSentimentScore ?? 0,
      decimals: 1,
      prefix: (kpis?.overallSentimentScore ?? 0) > 0 ? '+' : '',
      sub: 'Normalized index (-100 to +100)',
      icon: Award,
      tone: 'text-cyan-300',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Main Sentiment Telemetry Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time Spark RDD aggregated insights from Cloud SQL PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0B1324] px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-blue-500/50 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
          <button
            type="button"
            onClick={() => onNavigate('workbench')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer"
          >
            Analyze New Data
          </button>
        </div>
      </div>

      {/* Real-time SSE Spark RDD Job Banner (only visible when real SSE job event arrives) */}
      {liveJob && (
        <div className="rounded-xl border border-cyan-500/40 bg-[#0B1324] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-cyan-300">
              Spark RDD Job {liveJob.jobUid} · {liveJob.status}
            </span>
            <span className="font-mono-tabular text-slate-300">
              {liveJob.processedRecords}/{liveJob.totalRecords} records ({liveJob.progress}%)
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{liveJob.stage}</p>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${liveJob.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 8 KPI Cards (5 numeric animated + 3 categorical intelligence leaders) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-800/80 bg-[#0B1324] p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{card.label}</span>
              <card.icon className="w-4 h-4 text-slate-500" />
            </div>
            <p className={`mt-2.5 text-2xl font-bold ${card.tone}`}>
              <AnimatedCounter
                value={card.value}
                decimals={card.decimals}
                prefix={card.prefix}
                suffix={card.suffix}
              />
            </p>
            <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
          </div>
        ))}

        <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Most Discussed Sport</span>
            <Award className="w-4 h-4 text-slate-500" />
          </div>
          <p className="mt-2.5 font-display text-2xl font-bold text-white truncate">
            {kpis?.mostDiscussedSport ?? '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Highest comment volume</p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Most Trending Keyword</span>
            <Flame className="w-4 h-4 text-slate-500" />
          </div>
          <p className="mt-2.5 font-display text-2xl font-bold text-blue-400 truncate">
            {kpis?.mostTrendingKeyword ?? '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Top Spark flatMap() token</p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Dominant Emotion</span>
            <Smile className="w-4 h-4 text-slate-500" />
          </div>
          <p className="mt-2.5 font-display text-2xl font-bold text-cyan-300 truncate">
            {kpis?.dominantEmotion ?? '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">6-dimension emotion leader</p>
        </div>
      </div>

      {/* 3D Sentiment Spheres & 3D Sport Comparison Bars */}
      <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              3D Sentiment Spheres & Sports Comparison Stage
            </h2>
            <p className="text-xs text-slate-400">
              Orbit, hover, or click any 3D sport column to open its detailed analytics view.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('analytics')}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            Open All 18 Charts →
          </button>
        </div>
        {bundle ? (
          <SentimentShowcase3D
            kpis={bundle.kpis}
            sportsComparison={bundle.sportsComparison}
            onSelectSport={(slug) => onNavigate('analytics', slug)}
          />
        ) : (
          <div className="h-[380px] rounded-xl bg-slate-900/50 animate-pulse" />
        )}
      </div>

      {/* Recent Analyzed Comments Table */}
      <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Recent Spark RDD Processed Comments
            </h2>
            <p className="text-xs text-slate-400">
              Clearly distinguishes labeled Academic Demo Corpus records from live analyst submissions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            Export Reports →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 bg-[#070E1E]">
                <th className="py-3 px-4">Sport</th>
                <th className="py-3 px-4">Comment</th>
                <th className="py-3 px-4">Polarity</th>
                <th className="py-3 px-4 text-right">Score</th>
                <th className="py-3 px-4">Emotion</th>
                <th className="py-3 px-4">Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {(bundle?.recentComments || []).slice(0, 10).map((row) => (
                <tr key={row.commentId} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-medium text-white whitespace-nowrap">
                    {row.sportName}
                  </td>
                  <td className="py-3 px-4 text-slate-300 max-w-md truncate">
                    {row.rawText}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={
                        row.polarity === 'POSITIVE'
                          ? 'text-emerald-400 font-semibold'
                          : row.polarity === 'NEGATIVE'
                            ? 'text-rose-400 font-semibold'
                            : 'text-amber-400 font-semibold'
                      }
                    >
                      {row.polarity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono-tabular text-slate-200 whitespace-nowrap">
                    {row.score > 0 ? `+${row.score}` : row.score}
                  </td>
                  <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                    {row.dominantEmotion}
                  </td>
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {row.isDemo ? 'Demo Corpus' : 'Live Ingestion'} · {row.sourceName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
