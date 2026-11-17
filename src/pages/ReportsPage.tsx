import React from 'react';
import { FileSpreadsheet, FileText, Table } from 'lucide-react';
import {
  exportReportCsv,
  exportReportExcel,
  exportReportPdf,
  ReportType,
} from '../services/reportExporter';
import { AnalyticsBundle, AnalyticsFilterState } from '../types/analytics';

interface ReportsPageProps {
  bundle: AnalyticsBundle | null;
  filter: AnalyticsFilterState;
}

const REPORT_CARDS: Array<{
  type: ReportType;
  title: string;
  description: string;
}> = [
  {
    type: 'overall',
    title: 'Overall Analytics Executive Report',
    description: 'Complete KPI summary, polarity distribution, sport comparison, and processed sample records.',
  },
  {
    type: 'sentiment-distribution',
    title: 'Sentiment Distribution Report',
    description: 'Positive, Negative, and Neutral counts and percentages for the active filter slice.',
  },
  {
    type: 'sports-comparison',
    title: 'Sport-Wise Comparison Report',
    description: 'Head-to-head metrics across Cricket, Football, Basketball, Tennis, Hockey, Formula 1, Kabaddi, and Esports.',
  },
  {
    type: 'emotion-analysis',
    title: 'Human Emotion Detection Report',
    description: 'Average intensity shares across Joy, Anger, Sadness, Excitement, Fear, and Surprise.',
  },
  {
    type: 'keyword-analysis',
    title: 'Keyword Frequency & Polarity Report',
    description: 'Top extracted sports tokens from Spark RDD flatMap().reduceByKey() pipelines.',
  },
  {
    type: 'aspect-analysis',
    title: 'Aspect-Based Sentiment Report',
    description: 'Evaluations across Teams, Players, Performance, Strategy, Coaching, and Match Results.',
  },
];

export function ReportsPage({ bundle, filter }: ReportsPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">
          Reports & Multi-Format Export Center
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Generate downloadable CSV, PDF, and Excel reports reflecting active sport, date, and source filters.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] px-5 py-3.5 flex flex-wrap items-center gap-4 text-xs text-slate-300">
        <span>Active Scope: <strong className="text-white">{filter.sport.toUpperCase()}</strong></span>
        <span aria-hidden="true">·</span>
        <span>Granularity: <strong className="text-white">{filter.granularity}</strong></span>
        <span aria-hidden="true">·</span>
        <span>Source: <strong className="text-white">{filter.sourceFilter}</strong></span>
        <span aria-hidden="true">·</span>
        <span className="font-mono-tabular">
          Records in Scope: <strong className="text-cyan-300">{bundle?.kpis.totalComments ?? 0}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {REPORT_CARDS.map((card) => (
          <div
            key={card.type}
            className="rounded-xl border border-slate-800/80 bg-[#0B1324] p-5 flex flex-col justify-between"
          >
            <div>
              <h2 className="font-display text-base font-semibold text-white">{card.title}</h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">{card.description}</p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!bundle}
                onClick={() => bundle && exportReportCsv(bundle, filter, card.type)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-[#111C33] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500/60 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Table className="w-3.5 h-3.5 text-cyan-400" />
                CSV
              </button>
              <button
                type="button"
                disabled={!bundle}
                onClick={() => bundle && exportReportPdf(bundle, filter, card.type)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-[#111C33] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500/60 transition-colors cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                PDF
              </button>
              <button
                type="button"
                disabled={!bundle}
                onClick={() => bundle && exportReportExcel(bundle, filter, card.type)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-[#111C33] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500/60 transition-colors cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                Excel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
