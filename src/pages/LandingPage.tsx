import React from 'react';
import {
  ArrowRight,
  BarChart3,
  Cpu,
  Database,
  Layers,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { SportsGlobe3D } from '../three/SportsGlobe3D';
import { AnalyticsBundle, AppView, SportWithStats } from '../types/analytics';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { useAuth } from '../contexts/AuthContext';

interface LandingPageProps {
  bundle: AnalyticsBundle | null;
  sports: SportWithStats[];
  onNavigate: (view: AppView, sportSlug?: string) => void;
}

const TEAM_MEMBERS = [
  { index: '01', name: 'P Komal Kumar', focus: 'Spark RDD Pipeline & Java Backend' },
  { index: '02', name: 'P V Mahesh', focus: 'Full-Stack Architecture & Cloud SQL' },
  { index: '03', name: 'P Sresti Rahul', focus: 'Deterministic NLP & Lexicon Engine' },
  { index: '04', name: 'P Ravi Sankar', focus: '3D WebGL & Interactive Visualizations' },
  { index: '05', name: 'P Kiran Kumar', focus: 'Testing, Docker & Report Automation' },
];

const TECH_STACK = [
  { name: 'Apache Spark RDD', role: 'JavaRDD filter, map, flatMap, reduceByKey, groupByKey' },
  { name: 'Java 21 + Spring Boot', role: 'REST microservices, Spring Security JWT & OpenAPI' },
  { name: 'Deterministic NLP', role: 'Negation, intensifiers, 6 emotions & 6 aspect scorers' },
  { name: 'Cloud SQL PostgreSQL', role: '12 normalized relational tables via Drizzle & Flyway' },
  { name: 'Three.js WebGL', role: '3D Sports Globe, Sentiment Spheres & 3D Comparison Bars' },
  { name: 'Recharts + ECharts', role: '18 synchronized analytical charts & PDF/XLSX exports' },
];

export function LandingPage({ bundle, sports, onNavigate }: LandingPageProps) {
  const { dbUser, signInWithGoogle } = useAuth();
  const kpis = bundle?.kpis;

  return (
    <div className="min-h-screen bg-[#060B18] text-slate-100">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060B18]/95">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-8 px-6 py-4">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            SportsPulse RDD
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => onNavigate('sports')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sports
            </button>
            <button
              type="button"
              onClick={() => onNavigate('workbench')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Analyzer
            </button>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Analytics
            </button>
            <button
              type="button"
              onClick={() => onNavigate('about')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              About Project
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Explore Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Hero Split + Full-Width Live Stats Row */}
      <section className="mx-auto max-w-[1400px] px-6 pt-12 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-center">
            <p className="text-xs font-medium text-cyan-400">
              Big Data Tools and Techniques · Section 5CSE24
            </p>
            <h1 className="mt-3 font-display text-4xl lg:text-5xl font-bold tracking-tight text-white [text-wrap:balance] leading-[1.1]">
              Big Data Sports Sentiment Intelligence
            </h1>
            <p className="mt-5 text-base text-slate-300 leading-relaxed max-w-xl">
              Distributed fan opinion mining across eight global sports using Apache Spark RDD
              transformations, deterministic sports NLP, emotion and aspect extraction, and
              interactive 3D telemetry backed by Cloud SQL PostgreSQL.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors whitespace-nowrap cursor-pointer"
              >
                Explore Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('workbench')}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0B1324] px-5 py-3 text-sm font-semibold text-slate-100 hover:border-blue-500/60 transition-colors whitespace-nowrap cursor-pointer"
              >
                Analyze Sports Data
              </button>
              {!dbUser ? (
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-4 py-3 text-sm font-medium text-cyan-200 hover:bg-cyan-900/40 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Get Started with Google
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate('analytics')}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  18-Chart Suite
                </button>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
              <span>Apache Spark JavaRDD</span>
              <span aria-hidden="true">·</span>
              <span>Deterministic Sports Lexicon</span>
              <span aria-hidden="true">·</span>
              <span>PostgreSQL + Firebase Auth</span>
            </div>
          </div>

          <div className="lg:col-span-7">
            <SportsGlobe3D
              sports={sports}
              onSelectSport={(slug) => onNavigate('analytics', slug)}
            />
          </div>
        </div>

        {/* 4-Column Live Sentiment Strip */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] p-5">
            <p className="text-xs text-slate-400">Analyzed Sports Comments</p>
            <p className="mt-2 text-2xl font-bold text-white">
              <AnimatedCounter value={kpis?.totalComments ?? 0} />
            </p>
            <p className="mt-1 text-xs text-slate-400">PostgreSQL live + demo corpus</p>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] p-5">
            <p className="text-xs text-slate-400">Positive Sentiment Share</p>
            <p className="mt-2 text-2xl font-bold text-emerald-400">
              <AnimatedCounter value={kpis?.positivePct ?? 0} decimals={1} suffix="%" />
            </p>
            <p className="mt-1 text-xs text-slate-400">
              <span className="font-mono-tabular">{kpis?.positiveCount ?? 0}</span> positive opinions
            </p>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] p-5">
            <p className="text-xs text-slate-400">Net Sentiment Index</p>
            <p className="mt-2 text-2xl font-bold text-cyan-300">
              <AnimatedCounter
                value={kpis?.overallSentimentScore ?? 0}
                decimals={1}
                prefix={(kpis?.overallSentimentScore ?? 0) > 0 ? '+' : ''}
              />
            </p>
            <p className="mt-1 text-xs text-slate-400">Scale -100 to +100</p>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] p-5">
            <p className="text-xs text-slate-400">Dominant Emotion & Sport</p>
            <p className="mt-2 font-display text-xl font-bold text-white truncate">
              {kpis?.dominantEmotion ?? 'Excitement'}
            </p>
            <p className="mt-1 text-xs text-slate-400">Top sport: {kpis?.mostDiscussedSport ?? 'Cricket'}</p>
          </div>
        </div>
      </section>

      {/* Supported Sports Showcase */}
      <section className="border-t border-slate-800/70 bg-[#080E1F] py-14">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                01. Supported Global Sports
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Click any sport discipline to inspect its dedicated sentiment, emotion, and aspect breakdown.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('sports')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
            >
              Open All 8 Sports Cards →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sports.map((sp) => (
              <button
                key={sp.slug}
                type="button"
                onClick={() => onNavigate('analytics', sp.slug)}
                className="group text-left rounded-xl border border-slate-800/80 bg-[#0B1324] overflow-hidden hover:border-blue-500/50 transition-colors cursor-pointer"
              >
                <div className="relative h-36 w-full overflow-hidden bg-slate-900">
                  <img
                    src={sp.imagePath}
                    alt={`${sp.name} stadium analytics backdrop`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1324] via-[#0B1324]/30 to-transparent" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base font-semibold text-white">{sp.name}</h3>
                    <span className="font-mono-tabular text-xs text-cyan-300">
                      {sp.avgScore > 0 ? `+${sp.avgScore}` : sp.avgScore}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {sp.category} · <span className="font-mono-tabular">{sp.totalComments}</span> comments ·{' '}
                    <span className="text-emerald-400 font-mono-tabular">{sp.positivePct}% pos</span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities & Architecture Preview */}
      <section className="mx-auto max-w-[1400px] px-6 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <h2 className="font-display text-2xl font-bold text-white">
              02. Core Analytical Capabilities
            </h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Every uploaded CSV, TXT corpus, or manual comment passes through a multi-stage Spark RDD
              pipeline before persisting structured polarity, emotion, keyword, and aspect records.
            </p>

            <div className="mt-6 space-y-4">
              {[
                {
                  icon: Cpu,
                  title: 'Spark RDD Distributed Transformations',
                  desc: 'filter(), map(), flatMap(), mapToPair(), reduceByKey(), groupByKey(), cache(), and collect().',
                },
                {
                  icon: Sparkles,
                  title: 'Deterministic Sports NLP & Aspect Engine',
                  desc: 'Domain idioms, negation scopes, 6 human emotions, and 6 sports aspects without LLM latency.',
                },
                {
                  icon: BarChart3,
                  title: '12 Interactive Visualizations & Exports',
                  desc: 'Donut, Trends, Grouped Bar, Radar, Word Cloud, Heatmap, Aspect Bar, Area, Gauge, Treemap, Scatter.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Role-Based Security & Real-Time SSE',
                  desc: 'Firebase Google Authentication, Admin/Analyst/User RBAC, and live SSE job progress streams.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3.5 rounded-xl border border-slate-800/80 bg-[#0B1324] p-4"
                >
                  <item.icon className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#0B1324] p-6">
            <div>
              <h3 className="font-display text-lg font-semibold text-white">
                03. Technology Stack & Dual Deliverable Architecture
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Live Express + Cloud SQL runtime paired with an inspectable Java 21 / Spring Boot / Apache Spark RDD repository.
              </p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {TECH_STACK.map((tech) => (
                  <div
                    key={tech.name}
                    className="rounded-lg border border-slate-800 bg-[#070E1E] p-4"
                  >
                    <p className="text-sm font-semibold text-cyan-300">{tech.name}</p>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">{tech.role}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  12 PostgreSQL Tables
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Java 21 + Spark 3.5 Code Included
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                Inspect Java Spark Source →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Academic Abstract & Team Members (Section 5CSE24) */}
      <section className="border-t border-slate-800/70 bg-[#080E1F] py-14">
        <div className="mx-auto max-w-[1400px] px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 rounded-xl border border-slate-800/80 bg-[#0B1324] p-6">
            <p className="text-xs font-medium text-blue-400">
              Academic Mini-Project · Big Data Tools and Techniques · Section 5CSE24
            </p>
            <h2 className="mt-2 font-display text-xl font-bold text-white">
              Big Data Sentiment Analysis for Sports Using Spark RDD
            </h2>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">
              This project designs and implements a scalable sports sentiment intelligence platform
              powered by Apache Spark Resilient Distributed Datasets (RDDs). By parallelizing text
              normalization, stopword filtering, deterministic lexicon scoring, emotion detection,
              and aspect-based grouping across RDD partitions, the system transforms unstructured
              fan commentary across eight sports into actionable, multi-dimensional visual telemetry.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>Big Data</span>
              <span>·</span>
              <span>Apache Spark RDD</span>
              <span>·</span>
              <span>Java 21</span>
              <span>·</span>
              <span>NLP</span>
              <span>·</span>
              <span>Emotion Detection</span>
              <span>·</span>
              <span>Aspect Analysis</span>
            </div>
          </div>

          <div className="lg:col-span-6 rounded-xl border border-slate-800/80 bg-[#0B1324] p-6">
            <h2 className="font-display text-xl font-bold text-white">
              Project Team · Section 5CSE24
            </h2>
            <div className="mt-4 divide-y divide-slate-800/80">
              {TEAM_MEMBERS.map((member) => (
                <div key={member.index} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono-tabular text-xs text-cyan-400">{member.index}</span>
                    <span className="text-sm font-semibold text-white">{member.name}</span>
                  </div>
                  <span className="text-xs text-slate-400 text-right">{member.focus}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800/80 py-6 px-6">
        <div className="mx-auto max-w-[1400px] flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>SportsPulse RDD · Big Data Sentiment Analysis for Sports Using Apache Spark RDD</span>
          <span>Section 5CSE24 · Big Data Tools and Techniques</span>
        </div>
      </footer>
    </div>
  );
}
