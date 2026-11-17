import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  FileDown,
  FlaskConical,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Shield,
  Trophy,
  X,
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { fetchAnalyticsBundle, fetchSportsCatalog } from './services/api';
import { exportReportCsv, ReportType } from './services/reportExporter';
import {
  AnalyticsBundle,
  AnalyticsFilterState,
  AppView,
  SparkJobProgressEvent,
  SportWithStats,
} from './types/analytics';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { SportsSelectionPage } from './pages/SportsSelectionPage';
import { SentimentWorkbenchPage } from './pages/SentimentWorkbenchPage';
import { AdvancedAnalyticsPage } from './pages/AdvancedAnalyticsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AdminPage } from './pages/AdminPage';
import { AboutProjectPage } from './pages/AboutProjectPage';

const NAV_ITEMS: Array<{ id: AppView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'sports', label: 'Sports Directory', icon: Trophy },
  { id: 'workbench', label: 'Sentiment Analyzer', icon: FlaskConical },
  { id: 'analytics', label: 'Chart Analytics', icon: BarChart3 },
  { id: 'reports', label: 'Reports & Exports', icon: FileDown },
  { id: 'admin', label: 'Admin & Spark Code', icon: Shield },
  { id: 'about', label: 'About Project', icon: BookOpen },
];

function PlatformShell() {
  const { dbUser, loading: authLoading, authError, signInWithGoogle, logout } = useAuth();
  const [view, setView] = useState<AppView>('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [filter, setFilter] = useState<AnalyticsFilterState>({
    sport: 'all',
    granularity: 'days',
    sourceFilter: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const [bundle, setBundle] = useState<AnalyticsBundle | null>(null);
  const [sports, setSports] = useState<SportWithStats[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [liveJob, setLiveJob] = useState<SparkJobProgressEvent | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const [bundleRes, sportsRes] = await Promise.all([
        fetchAnalyticsBundle(filter),
        fetchSportsCatalog(),
      ]);
      setBundle(bundleRes);
      setSports(sportsRes);
    } catch (err: any) {
      setDataError(err.message || 'Unable to load analytics from PostgreSQL.');
    } finally {
      setLoadingData(false);
    }
  }, [filter]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Real-time Server-Sent Events subscription
  useEffect(() => {
    const es = new EventSource('/api/stream/jobs');
    es.addEventListener('job:progress', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as SparkJobProgressEvent;
        setLiveJob(data);
      } catch {
        // ignore malformed chunk
      }
    });
    es.addEventListener('analytics:updated', () => {
      loadAnalytics();
    });
    return () => {
      es.close();
    };
  }, [loadAnalytics]);

  const handleNavigate = (nextView: AppView, sportSlug?: string) => {
    if (sportSlug) {
      setFilter((prev) => ({ ...prev, sport: sportSlug }));
    }
    setView(nextView);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportChartCsv = (reportType: ReportType) => {
    if (bundle) {
      exportReportCsv(bundle, filter, reportType);
    }
  };

  if (view === 'landing') {
    return (
      <LandingPage
        bundle={bundle}
        sports={sports}
        onNavigate={handleNavigate}
      />
    );
  }

  const activeNav = NAV_ITEMS.find((n) => n.id === view);

  return (
    <div className="min-h-screen bg-[#060B18] text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-slate-800/80 bg-[#080F20]">
        <div>
          <div className="px-5 py-5 border-b border-slate-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleNavigate('landing')}
              className="font-display text-lg font-bold text-white tracking-tight cursor-pointer"
            >
              SportsPulse RDD
            </button>
          </div>

          <nav className="p-3 space-y-1">
            <button
              type="button"
              onClick={() => handleNavigate('landing')}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900/60 transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Landing Showcase
            </button>

            <div className="my-2 border-t border-slate-800/70" />

            {NAV_ITEMS.map((item) => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Account & Role Footer */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          {authError && (
            <p className="text-[11px] text-rose-400 leading-snug">{authError}</p>
          )}
          {authLoading ? (
            <p className="text-xs text-slate-500">Checking session...</p>
          ) : dbUser ? (
            <div className="space-y-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{dbUser.displayName}</p>
                <p className="text-[11px] text-slate-400 truncate">{dbUser.email}</p>
                <p className="mt-0.5 text-[11px] font-mono-tabular text-cyan-400">
                  Role: {dbUser.roleName}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-[#0B1324] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              Google Sign-In
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 bg-[#080F20] border-r border-slate-800 flex flex-col justify-between p-4">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <span className="font-display text-base font-bold text-white">SportsPulse RDD</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="mt-3 space-y-1">
                <button
                  type="button"
                  onClick={() => handleNavigate('landing')}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-slate-900"
                >
                  <Home className="w-4 h-4" />
                  Landing Showcase
                </button>
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium ${
                      view === item.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="pt-4 border-t border-slate-800">
              {dbUser ? (
                <button
                  type="button"
                  onClick={logout}
                  className="w-full rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200"
                >
                  Sign Out ({dbUser.roleName})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Google Sign-In
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Workspace Header */}
        <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#060B18]/95 px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden rounded-md border border-slate-700 p-1.5 text-slate-300 hover:text-white"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-xs text-slate-400 truncate">
              <span>Workspace</span>
              <span className="mx-2">/</span>
              <span className="font-semibold text-white">{activeNav?.label}</span>
              {filter.sport !== 'all' && (
                <>
                  <span className="mx-2">/</span>
                  <span className="text-cyan-300 capitalize">{filter.sport}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {liveJob && liveJob.status === 'RUNNING' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-cyan-300 font-mono-tabular whitespace-nowrap">
                <Activity className="w-3.5 h-3.5" />
                RDD {liveJob.progress}%
              </span>
            )}
            {dbUser ? (
              <span className="text-xs text-slate-300 whitespace-nowrap hidden sm:inline">
                {dbUser.displayName} · <span className="text-cyan-300">{dbUser.roleName}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors whitespace-nowrap cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto">
          {dataError && (
            <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-200 flex items-center justify-between gap-4">
              <span>{dataError}</span>
              <button
                type="button"
                onClick={loadAnalytics}
                className="rounded border border-rose-400/50 px-3 py-1 text-xs font-medium hover:bg-rose-900/40 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {view === 'dashboard' && (
            <DashboardPage
              bundle={bundle}
              loading={loadingData}
              liveJob={liveJob}
              onRefresh={loadAnalytics}
              onNavigate={handleNavigate}
            />
          )}

          {view === 'sports' && (
            <SportsSelectionPage
              sports={sports}
              loading={loadingData}
              onSelectSport={(slug) => handleNavigate('analytics', slug)}
              onNavigate={handleNavigate}
            />
          )}

          {view === 'workbench' && (
            <SentimentWorkbenchPage
              sports={sports}
              liveJob={liveJob}
              onJobCompleted={loadAnalytics}
            />
          )}

          {view === 'analytics' && (
            <AdvancedAnalyticsPage
              bundle={bundle}
              sports={sports}
              loading={loadingData}
              filter={filter}
              onChangeFilter={setFilter}
              onExportChartCsv={handleExportChartCsv}
              onDataMutated={loadAnalytics}
            />
          )}

          {view === 'reports' && (
            <ReportsPage bundle={bundle} filter={filter} />
          )}

          {view === 'admin' && <AdminPage />}

          {view === 'about' && <AboutProjectPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PlatformShell />
    </AuthProvider>
  );
}
