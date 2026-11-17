import React from 'react';

const KEYWORDS = [
  'Big Data',
  'Sentiment Analysis',
  'Apache Spark',
  'RDD',
  'Sports Analytics',
  'Java',
  'NLP',
  'Emotion Detection',
  'Data Visualization',
  'Comparative Analysis',
  'Spark RDD Operations',
  'AI Insights',
  'Sentiment Score',
  'Aspect Analysis',
];

const TEAM = [
  { roll: '01', name: 'P Komal Kumar', module: 'Apache Spark JavaRDD Pipeline & Distributed Transformations' },
  { roll: '02', name: 'P V Mahesh', module: 'Full-Stack System Architecture, PostgreSQL & Firebase Auth' },
  { roll: '03', name: 'P Sresti Rahul', module: 'Deterministic Sports NLP, Lexicon Rules & Aspect Scoring' },
  { roll: '04', name: 'P Ravi Sankar', module: 'Three.js 3D WebGL Scenes & 18-Chart Analytics Suite' },
  { roll: '05', name: 'P Kiran Kumar', module: 'Automated Testing, Docker Deployment & PDF/Excel Reporting' },
];

export function AboutProjectPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <p className="text-xs font-medium text-cyan-400">
          Big Data Tools and Techniques · Section 5CSE24
        </p>
        <h1 className="mt-1 font-display text-2xl lg:text-3xl font-bold text-white">
          Big Data Sentiment Analysis for Sports Using Apache Spark RDD
        </h1>
      </div>

      <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">Project Abstract</h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Sports broadcasting, leagues, and fan communities generate massive streams of unstructured
          textual feedback across matches, tournaments, and player performances. Traditional single-threaded
          sentiment tools struggle to normalize noisy slang, domain idioms, negations, and multi-aspect
          opinions at scale. This academic project implements a distributed big-data analytics platform
          centered on Apache Spark Resilient Distributed Datasets (RDDs) and deterministic sports Natural
          Language Processing.
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">
          Raw comments across eight global sports (Cricket, Football, Basketball, Tennis, Hockey,
          Formula 1, Kabaddi, and Esports) are partitioned into RDD datasets and processed through
          sequential transformations: <span className="font-mono-tabular text-cyan-300">filter()</span>{' '}
          for sanitation and deduplication, <span className="font-mono-tabular text-cyan-300">map()</span>{' '}
          for deterministic lexicon and negation-window scoring,{' '}
          <span className="font-mono-tabular text-cyan-300">flatMap()</span> for keyword tokenization,{' '}
          <span className="font-mono-tabular text-cyan-300">mapToPair()</span> and{' '}
          <span className="font-mono-tabular text-cyan-300">reduceByKey()</span> for polarity and
          keyword frequency aggregation, and{' '}
          <span className="font-mono-tabular text-cyan-300">groupByKey()</span> for aspect-based
          sentiment grouping across Teams, Players, Performance, Strategy, Coaching, and Match Results.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] p-6">
        <h2 className="font-display text-lg font-semibold text-white mb-4">
          Team Members · Section 5CSE24
        </h2>
        <div className="divide-y divide-slate-800">
          {TEAM.map((member) => (
            <div key={member.roll} className="py-3 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono-tabular text-xs text-cyan-400">{member.roll}</span>
                <span className="text-sm font-semibold text-white">{member.name}</span>
              </div>
              <span className="text-xs text-slate-400">{member.module}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] p-6">
        <h2 className="font-display text-lg font-semibold text-white mb-3">Project Keywords</h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          {KEYWORDS.join(' · ')}
        </p>
      </div>
    </div>
  );
}
