import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { AnalyticsChartsSuite } from '../charts/AnalyticsChartsSuite';
import { deleteComment, fetchPaginatedComments } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  AnalyticsBundle,
  AnalyticsFilterState,
  CommentRecord,
  SportWithStats,
} from '../types/analytics';
import { ReportType } from '../services/reportExporter';

interface AdvancedAnalyticsPageProps {
  bundle: AnalyticsBundle | null;
  sports: SportWithStats[];
  loading: boolean;
  filter: AnalyticsFilterState;
  onChangeFilter: (next: AnalyticsFilterState) => void;
  onExportChartCsv: (reportType: ReportType) => void;
  onDataMutated: () => void;
}

export function AdvancedAnalyticsPage({
  bundle,
  sports,
  loading,
  filter,
  onChangeFilter,
  onExportChartCsv,
  onDataMutated,
}: AdvancedAnalyticsPageProps) {
  const { dbUser } = useAuth();
  const [commentsPage, setCommentsPage] = useState(1);
  const [polarityFilter, setPolarityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [commentsData, setCommentsData] = useState<{
    items: CommentRecord[];
    total: number;
    totalPages: number;
  }>({ items: [], total: 0, totalPages: 1 });
  const [loadingComments, setLoadingComments] = useState(false);

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await fetchPaginatedComments({
        sport: filter.sport,
        polarity: polarityFilter,
        search: searchQuery,
        page: commentsPage,
      });
      setCommentsData({
        items: res.items || [],
        total: res.total || 0,
        totalPages: res.totalPages || 1,
      });
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [filter.sport, polarityFilter, searchQuery, commentsPage, bundle?.kpis.totalComments]);

  const handleDelete = async (id: number) => {
    try {
      await deleteComment(id);
      await loadComments();
      onDataMutated();
    } catch (err) {
      console.error(err);
    }
  };

  const canDelete = dbUser && (dbUser.roleName === 'ADMIN' || dbUser.roleName === 'ANALYST');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">
          Chart Analytics &amp; Statistical Intelligence Suite
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Synchronized 18-chart visualization suite (Histogram, Bar, Pie, Line, Violin Plot, Scatter, Box Plot, Heat Map, Bubble, Tree Map) powered by PostgreSQL.
        </p>
      </div>

      {/* Global Filter Bar */}
      <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filter.sport}
            onChange={(e) => {
              setCommentsPage(1);
              onChangeFilter({ ...filter, sport: e.target.value });
            }}
            aria-label="Filter by sport"
            className="rounded-lg border border-slate-700 bg-[#070E1E] px-3 py-1.5 text-xs font-medium text-slate-100"
          >
            <option value="all">All 8 Sports</option>
            {sports.map((sp) => (
              <option key={sp.slug} value={sp.slug}>
                {sp.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 rounded-lg bg-[#070E1E] p-1 border border-slate-800">
            {(['hours', 'days', 'weeks', 'months'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onChangeFilter({ ...filter, granularity: g })}
                className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors cursor-pointer ${
                  filter.granularity === g ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-[#070E1E] p-1 border border-slate-800">
            {([
              ['all', 'All Sources'],
              ['live', 'Live Only'],
              ['demo', 'Demo Corpus'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => onChangeFilter({ ...filter, sourceFilter: key })}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  filter.sourceFilter === key ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="date"
            value={filter.dateFrom}
            onChange={(e) => onChangeFilter({ ...filter, dateFrom: e.target.value })}
            aria-label="Date from"
            className="rounded-lg border border-slate-700 bg-[#070E1E] px-2.5 py-1.5 text-xs text-slate-200"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            value={filter.dateTo}
            onChange={(e) => onChangeFilter({ ...filter, dateTo: e.target.value })}
            aria-label="Date to"
            className="rounded-lg border border-slate-700 bg-[#070E1E] px-2.5 py-1.5 text-xs text-slate-200"
          />
          {(filter.sport !== 'all' || filter.dateFrom || filter.dateTo || filter.sourceFilter !== 'all') && (
            <button
              type="button"
              onClick={() =>
                onChangeFilter({
                  sport: 'all',
                  granularity: 'days',
                  sourceFilter: 'all',
                  dateFrom: '',
                  dateTo: '',
                })
              }
              className="text-xs text-blue-400 hover:text-blue-300 ml-1 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* All 12 Interactive Charts */}
      <AnalyticsChartsSuite
        bundle={bundle}
        loading={loading}
        onExportChartCsv={onExportChartCsv}
      />

      {/* Searchable Paginated Comments Explorer */}
      <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] overflow-hidden">
        <div className="p-5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Analyzed Comments Explorer ({commentsData.total} matching)
            </h2>
            <p className="text-xs text-slate-400">
              Filter by polarity or keyword; authenticated Analysts and Admins can remove records.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setCommentsPage(1);
                setSearchQuery(e.target.value);
              }}
              placeholder="Search comments or emotion..."
              className="rounded-lg border border-slate-700 bg-[#070E1E] px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500"
            />
            <select
              value={polarityFilter}
              onChange={(e) => {
                setCommentsPage(1);
                setPolarityFilter(e.target.value);
              }}
              aria-label="Filter polarity"
              className="rounded-lg border border-slate-700 bg-[#070E1E] px-3 py-1.5 text-xs text-slate-100"
            >
              <option value="ALL">All Polarities</option>
              <option value="POSITIVE">Positive</option>
              <option value="NEGATIVE">Negative</option>
              <option value="NEUTRAL">Neutral</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-[#070E1E] text-[11px] font-semibold text-slate-400">
                <th className="py-3 px-4">Sport</th>
                <th className="py-3 px-4">Comment</th>
                <th className="py-3 px-4">Polarity</th>
                <th className="py-3 px-4 text-right">Score</th>
                <th className="py-3 px-4">Emotion</th>
                <th className="py-3 px-4">Source</th>
                {canDelete && <th className="py-3 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {loadingComments ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading records...
                  </td>
                </tr>
              ) : commentsData.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No comments match your filter criteria.
                  </td>
                </tr>
              ) : (
                commentsData.items.map((row) => (
                  <tr key={row.commentId} className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-medium text-white whitespace-nowrap">
                      {row.sportName}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-lg">{row.rawText}</td>
                    <td className="py-3 px-4 whitespace-nowrap font-semibold">
                      <span
                        className={
                          row.polarity === 'POSITIVE'
                            ? 'text-emerald-400'
                            : row.polarity === 'NEGATIVE'
                              ? 'text-rose-400'
                              : 'text-amber-400'
                        }
                      >
                        {row.polarity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-200">
                      {row.score > 0 ? `+${row.score}` : row.score}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{row.dominantEmotion}</td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {row.isDemo ? 'Demo' : 'Live'} · {row.sourceName}
                    </td>
                    {canDelete && (
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(row.commentId)}
                          title="Delete comment"
                          className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono-tabular">
            Page {commentsPage} of {commentsData.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={commentsPage <= 1}
              onClick={() => setCommentsPage((p) => Math.max(1, p - 1))}
              className="rounded border border-slate-700 px-3 py-1 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={commentsPage >= commentsData.totalPages}
              onClick={() => setCommentsPage((p) => p + 1)}
              className="rounded border border-slate-700 px-3 py-1 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
