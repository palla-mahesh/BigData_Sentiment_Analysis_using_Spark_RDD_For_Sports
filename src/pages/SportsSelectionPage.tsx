import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { AppView, SportWithStats } from '../types/analytics';

interface SportsSelectionPageProps {
  sports: SportWithStats[];
  loading: boolean;
  onSelectSport: (slug: string) => void;
  onNavigate: (view: AppView, sportSlug?: string) => void;
}

export function SportsSelectionPage({
  sports,
  loading,
  onSelectSport,
  onNavigate,
}: SportsSelectionPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Sports Discipline Directory
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Select any of the eight supported sports to open its dedicated sentiment, emotion, and aspect dashboard.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('workbench')}
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer"
        >
          Ingest Sport Comments
        </button>
      </div>

      {loading && sports.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-80 rounded-xl bg-slate-900/60 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {sports.map((sp) => (
            <div
              key={sp.slug}
              className="rounded-xl border border-slate-800/80 bg-[#0B1324] overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                  <img
                    src={sp.imagePath}
                    alt={`${sp.name} broadcast venue`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1324] via-[#0B1324]/25 to-transparent" />
                </div>

                <div className="p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="font-display text-lg font-bold text-white">{sp.name}</h2>
                    <span className="font-mono-tabular text-xs font-semibold text-cyan-300">
                      Index {sp.avgScore > 0 ? `+${sp.avgScore}` : sp.avgScore}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {sp.category} · <span className="font-mono-tabular">{sp.totalComments}</span> comments
                  </p>
                  <p className="mt-3 text-xs text-slate-300 leading-relaxed line-clamp-2">
                    {sp.description}
                  </p>

                  {/* Polarity breakdown bar */}
                  <div className="mt-4">
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div style={{ width: `${sp.positivePct}%` }} className="bg-emerald-500" />
                      <div style={{ width: `${sp.neutralPct}%` }} className="bg-amber-500" />
                      <div style={{ width: `${sp.negativePct}%` }} className="bg-rose-500" />
                    </div>
                    <div className="mt-2 flex items-center justify-between font-mono-tabular text-[11px]">
                      <span className="text-emerald-400">Pos {sp.positivePct}%</span>
                      <span className="text-amber-400">Neu {sp.neutralPct}%</span>
                      <span className="text-rose-400">Neg {sp.negativePct}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 truncate">
                  Topics: {sp.trendingTopics.slice(0, 3).join(', ') || 'victory, tactics'}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectSport(sp.slug)}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  View Analytics
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
