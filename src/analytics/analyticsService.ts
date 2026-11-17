import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  analysisJobs,
  aspects,
  auditLogs,
  comments,
  dataSources,
  emotionResults,
  keywords,
  roles,
  sentimentResults,
  sports,
  users,
} from '../db/schema.ts';
import { ensureSeededDatabase } from '../ingestion/seedData.ts';
import {
  emitJobProgress,
  RawCommentRecord,
  runSparkRddSentimentPipeline,
  sparkEvents,
} from '../spark/rddPipeline.ts';

export interface AnalyticsFilter {
  sportSlug?: string;
  granularity?: 'hours' | 'days' | 'weeks' | 'months';
  dateFrom?: string;
  dateTo?: string;
  sourceFilter?: 'all' | 'live' | 'demo';
}

async function fetchFilteredRows(filter: AnalyticsFilter) {
  await ensureSeededDatabase();

  const conditions = [];
  if (filter.sportSlug && filter.sportSlug !== 'all') {
    const sportRow = await db.select().from(sports).where(eq(sports.slug, filter.sportSlug));
    if (sportRow.length > 0) {
      conditions.push(eq(comments.sportId, sportRow[0].id));
    } else {
      return [];
    }
  }
  if (filter.dateFrom) {
    const dFrom = new Date(filter.dateFrom);
    if (!Number.isNaN(dFrom.getTime())) {
      conditions.push(gte(comments.commentedAt, dFrom));
    }
  }
  if (filter.dateTo) {
    const dTo = new Date(filter.dateTo);
    if (!Number.isNaN(dTo.getTime())) {
      conditions.push(lte(comments.commentedAt, dTo));
    }
  }
  if (filter.sourceFilter === 'live') {
    conditions.push(eq(comments.isDemo, false));
  } else if (filter.sourceFilter === 'demo') {
    conditions.push(eq(comments.isDemo, true));
  }

  try {
    const rows = await db
      .select({
        commentId: comments.id,
        sportId: comments.sportId,
        sportName: sports.name,
        sportSlug: sports.slug,
        accentColor: sports.accentColor,
        sourceName: dataSources.name,
        sourceType: dataSources.providerType,
        isDemo: comments.isDemo,
        authorHandle: comments.authorHandle,
        rawText: comments.rawText,
        tokenCount: comments.tokenCount,
        commentedAt: comments.commentedAt,
        polarity: sentimentResults.polarity,
        score: sentimentResults.score,
        confidence: sentimentResults.confidence,
        matchedTokens: sentimentResults.matchedTokens,
        joy: emotionResults.joy,
        anger: emotionResults.anger,
        sadness: emotionResults.sadness,
        excitement: emotionResults.excitement,
        fear: emotionResults.fear,
        surprise: emotionResults.surprise,
        dominantEmotion: emotionResults.dominantEmotion,
      })
      .from(comments)
      .innerJoin(sports, eq(comments.sportId, sports.id))
      .innerJoin(dataSources, eq(comments.sourceId, dataSources.id))
      .innerJoin(sentimentResults, eq(comments.id, sentimentResults.commentId))
      .innerJoin(emotionResults, eq(comments.id, emotionResults.commentId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(comments.commentedAt));

    return rows;
  } catch (error) {
    console.error('Database analytics query failed:', error);
    throw new Error('Failed to load analytics dataset from PostgreSQL.', { cause: error });
  }
}

function getBucketKey(date: Date, granularity: 'hours' | 'days' | 'weeks' | 'months'): string {
  const d = new Date(date);
  if (granularity === 'hours') {
    return `${d.toISOString().slice(0, 13)}:00`;
  }
  if (granularity === 'weeks') {
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
    return `Wk ${monday.toISOString().slice(5, 10)}`;
  }
  if (granularity === 'months') {
    return d.toISOString().slice(0, 7);
  }
  return d.toISOString().slice(0, 10);
}

export async function getFullAnalyticsBundle(filter: AnalyticsFilter) {
  const rows = await fetchFilteredRows(filter);
  const allSports = await db.select().from(sports);
  const granularity = filter.granularity || 'days';

  const totalComments = rows.length;
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  let scoreSum = 0;

  const emotionTotals = {
    joy: 0,
    anger: 0,
    sadness: 0,
    excitement: 0,
    fear: 0,
    surprise: 0,
  };
  const emotionDomCounts = new Map<string, number>();
  const sportStatsMap = new Map<
    string,
    {
      sportId: number;
      slug: string;
      name: string;
      accentColor: string;
      total: number;
      positive: number;
      negative: number;
      neutral: number;
      scoreSum: number;
    }
  >();

  for (const s of allSports) {
    sportStatsMap.set(s.slug, {
      sportId: s.id,
      slug: s.slug,
      name: s.name,
      accentColor: s.accentColor,
      total: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
      scoreSum: 0,
    });
  }

  const trendMap = new Map<
    string,
    { bucket: string; positive: number; negative: number; neutral: number; volume: number; scoreSum: number }
  >();

  for (const r of rows) {
    if (r.polarity === 'POSITIVE') positiveCount++;
    else if (r.polarity === 'NEGATIVE') negativeCount++;
    else neutralCount++;

    scoreSum += r.score;
    emotionTotals.joy += r.joy;
    emotionTotals.anger += r.anger;
    emotionTotals.sadness += r.sadness;
    emotionTotals.excitement += r.excitement;
    emotionTotals.fear += r.fear;
    emotionTotals.surprise += r.surprise;

    emotionDomCounts.set(r.dominantEmotion, (emotionDomCounts.get(r.dominantEmotion) || 0) + 1);

    const sp = sportStatsMap.get(r.sportSlug);
    if (sp) {
      sp.total++;
      sp.scoreSum += r.score;
      if (r.polarity === 'POSITIVE') sp.positive++;
      else if (r.polarity === 'NEGATIVE') sp.negative++;
      else sp.neutral++;
    }

    const bucket = getBucketKey(r.commentedAt, granularity);
    const tb = trendMap.get(bucket) || {
      bucket,
      positive: 0,
      negative: 0,
      neutral: 0,
      volume: 0,
      scoreSum: 0,
    };
    tb.volume++;
    tb.scoreSum += r.score;
    if (r.polarity === 'POSITIVE') tb.positive++;
    else if (r.polarity === 'NEGATIVE') tb.negative++;
    else tb.neutral++;
    trendMap.set(bucket, tb);
  }

  const overallSentimentScore =
    totalComments > 0 ? Number((scoreSum / totalComments).toFixed(1)) : 0;

  // Keywords query
  let kwRows: Array<{ keyword: string; frequency: number; weight: number; polarity: string; sportId: number }> = [];
  let aspectRows: Array<{ aspectName: string; polarity: string; score: number; sportId: number }> = [];

  if (rows.length > 0) {
    const sportTarget =
      filter.sportSlug && filter.sportSlug !== 'all'
        ? allSports.find((s) => s.slug === filter.sportSlug)?.id
        : undefined;

    kwRows = await db
      .select({
        keyword: keywords.keyword,
        frequency: keywords.frequency,
        weight: keywords.weight,
        polarity: keywords.polarity,
        sportId: keywords.sportId,
      })
      .from(keywords)
      .where(sportTarget ? eq(keywords.sportId, sportTarget) : undefined);

    aspectRows = await db
      .select({
        aspectName: aspects.aspectName,
        polarity: aspects.polarity,
        score: aspects.score,
        sportId: aspects.sportId,
      })
      .from(aspects)
      .where(sportTarget ? eq(aspects.sportId, sportTarget) : undefined);
  }

  // Aggregate keywords
  const kwAgg = new Map<string, { keyword: string; count: number; weightSum: number; polarity: string }>();
  for (const k of kwRows) {
    const existing = kwAgg.get(k.keyword) || {
      keyword: k.keyword,
      count: 0,
      weightSum: 0,
      polarity: k.polarity,
    };
    existing.count += k.frequency;
    existing.weightSum += k.weight;
    kwAgg.set(k.keyword, existing);
  }
  const topKeywords = Array.from(kwAgg.values())
    .map((k) => ({
      keyword: k.keyword,
      count: k.count,
      value: Number(k.weightSum.toFixed(1)),
      polarity: k.polarity,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 36);

  // Aggregate aspects
  const aspectOrder = ['Teams', 'Players', 'Performance', 'Strategy', 'Coaching', 'Match Results'];
  const aspectMap = new Map<
    string,
    { aspect: string; positive: number; negative: number; neutral: number; scoreSum: number; total: number }
  >();
  for (const name of aspectOrder) {
    aspectMap.set(name, { aspect: name, positive: 0, negative: 0, neutral: 0, scoreSum: 0, total: 0 });
  }
  for (const a of aspectRows) {
    const entry = aspectMap.get(a.aspectName);
    if (!entry) continue;
    entry.total++;
    entry.scoreSum += a.score;
    if (a.polarity === 'POSITIVE') entry.positive++;
    else if (a.polarity === 'NEGATIVE') entry.negative++;
    else entry.neutral++;
  }
  const aspectAnalysis = Array.from(aspectMap.values()).map((a) => ({
    ...a,
    avgScore: a.total > 0 ? Number((a.scoreSum / a.total).toFixed(1)) : 0,
  }));

  // Sports comparison
  const sportsComparison = Array.from(sportStatsMap.values()).map((sp) => ({
    sportId: sp.sportId,
    slug: sp.slug,
    sport: sp.name,
    accentColor: sp.accentColor,
    total: sp.total,
    positive: sp.positive,
    negative: sp.negative,
    neutral: sp.neutral,
    positivePct: sp.total > 0 ? Number(((sp.positive / sp.total) * 100).toFixed(1)) : 0,
    negativePct: sp.total > 0 ? Number(((sp.negative / sp.total) * 100).toFixed(1)) : 0,
    neutralPct: sp.total > 0 ? Number(((sp.neutral / sp.total) * 100).toFixed(1)) : 0,
    avgScore: sp.total > 0 ? Number((sp.scoreSum / sp.total).toFixed(1)) : 0,
  }));

  const mostDiscussedSport =
    [...sportsComparison].sort((a, b) => b.total - a.total)[0]?.sport || 'Cricket';
  const mostTrendingKeyword = topKeywords[0]?.keyword || 'victory';
  const dominantEmotion =
    Array.from(emotionDomCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Excitement';

  const trends = Array.from(trendMap.values())
    .sort((a, b) => a.bucket.localeCompare(b.bucket))
    .map((t) => ({
      bucket: t.bucket,
      positive: t.positive,
      negative: t.negative,
      neutral: t.neutral,
      volume: t.volume,
      avgScore: t.volume > 0 ? Number((t.scoreSum / t.volume).toFixed(1)) : 0,
    }));

  // Heatmap matrix: Sports x recent 6 time periods
  const recentBuckets = trends.slice(-6).map((t) => t.bucket);
  const heatmapData: Array<{ sport: string; bucket: string; score: number; count: number }> = [];
  for (const sp of allSports) {
    for (const bucket of recentBuckets) {
      const slice = rows.filter(
        (r) => r.sportSlug === sp.slug && getBucketKey(r.commentedAt, granularity) === bucket,
      );
      const avg =
        slice.length > 0
          ? Number((slice.reduce((acc, s) => acc + s.score, 0) / slice.length).toFixed(1))
          : 0;
      heatmapData.push({
        sport: sp.name,
        bucket,
        score: avg,
        count: slice.length,
      });
    }
  }

  // Scatter correlation: comment volume vs sentiment score per sport-day
  const scatterMap = new Map<string, { sport: string; volume: number; scoreSum: number }>();
  for (const r of rows) {
    const key = `${r.sportName}::${r.commentedAt.toISOString().slice(0, 10)}`;
    const curr = scatterMap.get(key) || { sport: r.sportName, volume: 0, scoreSum: 0 };
    curr.volume++;
    curr.scoreSum += r.score;
    scatterMap.set(key, curr);
  }
  const correlationScatter = Array.from(scatterMap.values()).map((c) => ({
    sport: c.sport,
    volume: c.volume,
    avgScore: Number((c.scoreSum / c.volume).toFixed(1)),
  }));

  const divisor = Math.max(1, totalComments);
  const emotionsRadar = [
    { emotion: 'Joy', value: Number((emotionTotals.joy / divisor).toFixed(1)) },
    { emotion: 'Excitement', value: Number((emotionTotals.excitement / divisor).toFixed(1)) },
    { emotion: 'Surprise', value: Number((emotionTotals.surprise / divisor).toFixed(1)) },
    { emotion: 'Fear', value: Number((emotionTotals.fear / divisor).toFixed(1)) },
    { emotion: 'Sadness', value: Number((emotionTotals.sadness / divisor).toFixed(1)) },
    { emotion: 'Anger', value: Number((emotionTotals.anger / divisor).toFixed(1)) },
  ];

  // Score Histogram (8 bins from -100 to +100)
  const histBins: Array<{
    label: string;
    min: number;
    max: number;
    zone: 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE';
    count: number;
  }> = [
    { label: '-100..-75', min: -100, max: -75, zone: 'NEGATIVE', count: 0 },
    { label: '-75..-50', min: -75, max: -50, zone: 'NEGATIVE', count: 0 },
    { label: '-50..-25', min: -50, max: -25, zone: 'NEGATIVE', count: 0 },
    { label: '-25..0', min: -25, max: 0, zone: 'NEUTRAL', count: 0 },
    { label: '0..25', min: 0, max: 25, zone: 'NEUTRAL', count: 0 },
    { label: '25..50', min: 25, max: 50, zone: 'POSITIVE', count: 0 },
    { label: '50..75', min: 50, max: 75, zone: 'POSITIVE', count: 0 },
    { label: '75..100', min: 75, max: 101, zone: 'POSITIVE', count: 0 },
  ];
  for (const r of rows) {
    const s = Math.max(-100, Math.min(100, Number.isFinite(r.score) ? r.score : 0));
    const bin = histBins.find((b) => s >= b.min && s < b.max) || histBins[histBins.length - 1];
    bin.count++;
  }
  const scoreHistogram = histBins.map((b) => ({
    range: b.label,
    count: b.count,
    zone: b.zone,
  }));

  // Emotion Pie Chart (dominant emotion distribution across comments)
  const emotionColors: Record<string, string> = {
    Joy: '#10B981',
    Excitement: '#38BDF8',
    Surprise: '#A855F7',
    Fear: '#F59E0B',
    Sadness: '#6366F1',
    Anger: '#EF4444',
  };
  const emotionPie = ['Joy', 'Excitement', 'Surprise', 'Fear', 'Sadness', 'Anger']
    .map((name) => ({
      name,
      value: emotionDomCounts.get(name) || 0,
      color: emotionColors[name] || '#38BDF8',
    }))
    .filter((item) => item.value > 0);

  // Box Plots & Violin Plots per Sport (5-number summary + Gaussian KDE)
  const quantile = (sorted: number[], p: number): number => {
    if (sorted.length === 0) return 0;
    const pos = (sorted.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    const val =
      sorted[base + 1] !== undefined
        ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
        : sorted[base];
    return Number(val.toFixed(1));
  };

  const kdeSamplePoints = Array.from({ length: 17 }, (_, idx) => -100 + idx * 12.5);
  const sportBoxPlots: Array<{
    sport: string;
    stats: [number, number, number, number, number];
    count: number;
  }> = [];
  const sportViolins: Array<{
    sport: string;
    accentColor: string;
    count: number;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    kde: Array<{ y: number; density: number }>;
  }> = [];
  const bubbleData: Array<{
    sport: string;
    volume: number;
    avgScore: number;
    avgConfidence: number;
    positivePct: number;
    accentColor: string;
  }> = [];

  for (const sp of allSports) {
    const spRows = rows.filter((r) => r.sportSlug === sp.slug);
    if (spRows.length === 0) continue;

    const scores = spRows
      .map((r) => (Number.isFinite(r.score) ? r.score : 0))
      .sort((a, b) => a - b);
    const min = Number(scores[0].toFixed(1));
    const q1 = quantile(scores, 0.25);
    const median = quantile(scores, 0.5);
    const q3 = quantile(scores, 0.75);
    const max = Number(scores[scores.length - 1].toFixed(1));

    sportBoxPlots.push({
      sport: sp.name,
      stats: [min, q1, median, q3, max],
      count: scores.length,
    });

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((acc, v) => acc + (v - mean) ** 2, 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const bandwidth = Math.max(15, 1.06 * (stdDev || 18) * Math.pow(scores.length, -0.2));

    const rawDensities = kdeSamplePoints.map((y) => {
      const sumKernel = scores.reduce((acc, x) => {
        const z = (y - x) / bandwidth;
        return acc + Math.exp(-0.5 * z * z);
      }, 0);
      return {
        y,
        density: sumKernel / (scores.length * bandwidth * Math.sqrt(2 * Math.PI)),
      };
    });
    const maxDensity = Math.max(1e-6, ...rawDensities.map((d) => d.density));
    sportViolins.push({
      sport: sp.name,
      accentColor: sp.accentColor,
      count: scores.length,
      min,
      q1,
      median,
      q3,
      max,
      kde: rawDensities.map((d) => ({
        y: d.y,
        density: Number((d.density / maxDensity).toFixed(3)),
      })),
    });

    const avgConf =
      spRows.reduce((acc, r) => acc + (Number.isFinite(r.confidence) ? r.confidence : 0.75), 0) /
      spRows.length;
    const spStat = sportsComparison.find((s) => s.slug === sp.slug);
    bubbleData.push({
      sport: sp.name,
      volume: spRows.length,
      avgScore: spStat?.avgScore ?? Number(mean.toFixed(1)),
      avgConfidence: Number((avgConf * 100).toFixed(1)),
      positivePct: spStat?.positivePct ?? 0,
      accentColor: sp.accentColor,
    });
  }

  return {
    kpis: {
      totalComments,
      positiveCount,
      negativeCount,
      neutralCount,
      positivePct: totalComments > 0 ? Number(((positiveCount / totalComments) * 100).toFixed(1)) : 0,
      negativePct: totalComments > 0 ? Number(((negativeCount / totalComments) * 100).toFixed(1)) : 0,
      neutralPct: totalComments > 0 ? Number(((neutralCount / totalComments) * 100).toFixed(1)) : 0,
      overallSentimentScore,
      mostDiscussedSport,
      mostTrendingKeyword,
      dominantEmotion,
    },
    distribution: [
      { name: 'Positive', value: positiveCount, color: '#10B981' },
      { name: 'Negative', value: negativeCount, color: '#EF4444' },
      { name: 'Neutral', value: neutralCount, color: '#F59E0B' },
    ],
    trends,
    sportsComparison,
    emotionsRadar,
    topKeywords,
    heatmap: {
      buckets: recentBuckets,
      sports: allSports.map((s) => s.name),
      cells: heatmapData,
    },
    aspectAnalysis,
    correlationScatter,
    scoreHistogram,
    emotionPie,
    sportBoxPlots,
    sportViolins,
    bubbleData,
    recentComments: rows.slice(0, 30),
  };
}

export async function getSportsListWithStats() {
  await ensureSeededDatabase();
  const allSports = await db.select().from(sports);
  const bundle = await getFullAnalyticsBundle({});

  return allSports.map((sp) => {
    const stat = bundle.sportsComparison.find((s) => s.slug === sp.slug);
    const sportKeywords = bundle.topKeywords.slice(0, 4).map((k) => k.keyword);
    return {
      ...sp,
      totalComments: stat?.total ?? 0,
      positivePct: stat?.positivePct ?? 0,
      negativePct: stat?.negativePct ?? 0,
      neutralPct: stat?.neutralPct ?? 0,
      avgScore: stat?.avgScore ?? 0,
      trendingTopics: sportKeywords,
    };
  });
}

export async function ingestAndAnalyzeComments(params: {
  sportSlug: string;
  texts: string[];
  sourceSlug: string;
  userId?: number;
  actorEmail?: string;
  authorHandle?: string;
}) {
  await ensureSeededDatabase();
  const [sportRow] = await db.select().from(sports).where(eq(sports.slug, params.sportSlug));
  if (!sportRow) {
    throw new Error(`Unknown sport: ${params.sportSlug}`);
  }

  const [sourceRow] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.slug, params.sourceSlug));
  const resolvedSource = sourceRow || (await db.select().from(dataSources))[1];

  const jobUid = `spark-job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const partitions = Math.min(8, Math.max(2, Math.ceil(params.texts.length / 4)));

  const [jobRow] = await db
    .insert(analysisJobs)
    .values({
      jobUid,
      userId: params.userId ?? null,
      sportId: sportRow.id,
      sourceId: resolvedSource.id,
      status: 'RUNNING',
      totalRecords: params.texts.length,
      processedRecords: 0,
      rddPartitions: partitions,
    })
    .returning();

  emitJobProgress({
    jobUid,
    stage: 'parallelize() — Partitioning comments into Spark RDD nodes',
    progress: 10,
    status: 'RUNNING',
    processedRecords: 0,
    totalRecords: params.texts.length,
    sportSlug: sportRow.slug,
  });

  const rawRecords: RawCommentRecord[] = params.texts.map((t, i) => ({
    sportId: sportRow.id,
    sportSlug: sportRow.slug,
    authorHandle: params.authorHandle || `@analyst_live_${i + 1}`,
    rawText: t,
    commentedAt: new Date(),
  }));

  const rddOutput = runSparkRddSentimentPipeline(rawRecords, jobUid, partitions);

  let insertedComments: Array<{ id: number }> = [];
  if (rddOutput.records.length > 0) {
    insertedComments = await db
      .insert(comments)
      .values(
        rddOutput.records.map((rec) => ({
          sportId: sportRow.id,
          sourceId: resolvedSource.id,
          jobId: jobRow.id,
          userId: params.userId ?? null,
          authorHandle: rec.authorHandle || '@analyst',
          rawText: rec.rawText,
          normalizedText: rec.analysis.normalizedText,
          tokenCount: rec.analysis.tokens.length,
          isDemo: resolvedSource.isDemo,
          commentedAt: rec.commentedAt || new Date(),
        })),
      )
      .returning({ id: comments.id });

    await db.insert(sentimentResults).values(
      rddOutput.records.map((rec, i) => ({
        commentId: insertedComments[i].id,
        polarity: rec.analysis.polarity,
        score: rec.analysis.score,
        confidence: rec.analysis.confidence,
        matchedTokens: rec.analysis.matchedTokens,
      })),
    );

    await db.insert(emotionResults).values(
      rddOutput.records.map((rec, i) => ({
        commentId: insertedComments[i].id,
        joy: rec.analysis.emotions.joy,
        anger: rec.analysis.emotions.anger,
        sadness: rec.analysis.emotions.sadness,
        excitement: rec.analysis.emotions.excitement,
        fear: rec.analysis.emotions.fear,
        surprise: rec.analysis.emotions.surprise,
        dominantEmotion: rec.analysis.emotions.dominantEmotion,
      })),
    );

    const kwValues = rddOutput.records.flatMap((rec, i) =>
      rec.analysis.keywords.map((kw) => ({
        commentId: insertedComments[i].id,
        sportId: sportRow.id,
        keyword: kw.keyword,
        frequency: kw.frequency,
        weight: kw.weight,
        polarity: kw.polarity,
      })),
    );
    if (kwValues.length > 0) {
      await db.insert(keywords).values(kwValues);
    }

    const aspectValues = rddOutput.records.flatMap((rec, i) =>
      rec.analysis.aspects.map((asp) => ({
        commentId: insertedComments[i].id,
        sportId: sportRow.id,
        aspectName: asp.aspectName,
        polarity: asp.polarity,
        score: asp.score,
        confidence: asp.confidence,
      })),
    );
    if (aspectValues.length > 0) {
      await db.insert(aspects).values(aspectValues);
    }
  }
  const insertedIds = insertedComments.map((c) => c.id);

  await db
    .update(analysisJobs)
    .set({
      status: 'COMPLETED',
      processedRecords: rddOutput.records.length,
      durationMs: rddOutput.totalDurationMs,
      stageMetrics: { stages: rddOutput.stageMetrics },
      updatedAt: new Date(),
    })
    .where(eq(analysisJobs.id, jobRow.id));

  await db
    .update(dataSources)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(eq(dataSources.id, resolvedSource.id));

  await db.insert(auditLogs).values({
    userId: params.userId ?? null,
    actorEmail: params.actorEmail || 'anonymous',
    action: 'RUN_SPARK_RDD_ANALYSIS',
    resourceType: 'analysis_jobs',
    resourceId: jobUid,
    details: {
      sport: sportRow.name,
      source: resolvedSource.name,
      recordsAnalyzed: rddOutput.records.length,
      durationMs: rddOutput.totalDurationMs,
    },
  });

  emitJobProgress({
    jobUid,
    stage: 'collect() — Persisted RDD results to PostgreSQL',
    progress: 100,
    status: 'COMPLETED',
    processedRecords: rddOutput.records.length,
    totalRecords: params.texts.length,
    sportSlug: sportRow.slug,
  });

  sparkEvents.emit('analytics:updated', {
    jobUid,
    sportSlug: sportRow.slug,
    addedCount: rddOutput.records.length,
  });

  return {
    job: {
      ...jobRow,
      status: 'COMPLETED',
      processedRecords: rddOutput.records.length,
      durationMs: rddOutput.totalDurationMs,
      stageMetrics: { stages: rddOutput.stageMetrics },
    },
    rddSummary: {
      partitions: rddOutput.partitions,
      sentimentTotals: rddOutput.sentimentTotals,
      keywordFrequencies: rddOutput.keywordFrequencies.slice(0, 15),
      aspectGroups: rddOutput.aspectGroups,
      stageMetrics: rddOutput.stageMetrics,
    },
    results: rddOutput.records.map((r, i) => ({
      commentId: insertedIds[i],
      sport: sportRow.name,
      ...r.analysis,
    })),
  };
}

export async function getAdminOverview() {
  await ensureSeededDatabase();
  const [allUsers, allRoles, allSources, jobs, logs] = await Promise.all([
    db.select().from(users).orderBy(desc(users.createdAt)),
    db.select().from(roles),
    db.select().from(dataSources).orderBy(dataSources.id),
    db.select().from(analysisJobs).orderBy(desc(analysisJobs.createdAt)).limit(25),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(40),
  ]);

  return {
    users: allUsers,
    roles: allRoles,
    dataSources: allSources,
    jobs,
    auditLogs: logs,
  };
}

export async function updateUserRole(targetUserId: number, roleName: string, actorEmail: string) {
  const [roleRow] = await db.select().from(roles).where(eq(roles.name, roleName));
  if (!roleRow) {
    throw new Error(`Invalid role: ${roleName}`);
  }
  const [updated] = await db
    .update(users)
    .set({ roleId: roleRow.id, roleName: roleRow.name, updatedAt: new Date() })
    .where(eq(users.id, targetUserId))
    .returning();

  if (updated) {
    await db.insert(auditLogs).values({
      actorEmail,
      action: 'UPDATE_USER_ROLE',
      resourceType: 'users',
      resourceId: String(targetUserId),
      details: { email: updated.email, newRole: roleRow.name },
    });
  }
  return updated;
}

export async function deleteCommentById(commentId: number, actorEmail: string) {
  const [deleted] = await db.delete(comments).where(eq(comments.id, commentId)).returning();
  if (deleted) {
    await db.insert(auditLogs).values({
      actorEmail,
      action: 'DELETE_COMMENT',
      resourceType: 'comments',
      resourceId: String(commentId),
      details: { sportId: deleted.sportId },
    });
    sparkEvents.emit('analytics:updated', { deletedId: commentId });
  }
  return deleted;
}

export async function getCommentsPaginated(params: {
  sportSlug?: string;
  polarity?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const rows = await fetchFilteredRows({ sportSlug: params.sportSlug });
  let filtered = rows;
  if (params.polarity && params.polarity !== 'ALL') {
    filtered = filtered.filter((r) => r.polarity === params.polarity);
  }
  if (params.search && params.search.trim().length > 0) {
    const q = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.rawText.toLowerCase().includes(q) ||
        r.sportName.toLowerCase().includes(q) ||
        r.dominantEmotion.toLowerCase().includes(q),
    );
  }
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(5, params.pageSize || 12));
  const total = filtered.length;
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
