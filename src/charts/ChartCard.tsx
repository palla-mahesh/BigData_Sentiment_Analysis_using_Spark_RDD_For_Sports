import React from 'react';
import { Download } from 'lucide-react';

interface ChartCardProps {
  title: string;
  subtitle: string;
  loading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  onExport?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  loading,
  isEmpty,
  emptyMessage = 'No analyzed comments match the current filter.',
  onExport,
  children,
  className = '',
}: ChartCardProps) {
  return (
    <section
      className={`rounded-xl border border-slate-800/80 bg-[#0B1324] p-5 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-slate-100 truncate">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-400 truncate">{subtitle}</p>
        </div>
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/80 bg-[#111C33] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-blue-500/50 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        )}
      </div>

      {loading ? (
        <div className="h-[280px] w-full rounded-lg bg-slate-900/60 animate-pulse flex items-center justify-center text-xs text-slate-500">
          Loading chart telemetry...
        </div>
      ) : isEmpty ? (
        <div className="h-[280px] w-full rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-medium text-slate-300">No Data in Selected Slice</p>
          <p className="mt-1 text-xs text-slate-500 max-w-xs">{emptyMessage}</p>
        </div>
      ) : (
        <div className="w-full">{children}</div>
      )}
    </section>
  );
}
