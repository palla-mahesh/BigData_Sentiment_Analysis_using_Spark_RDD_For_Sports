import { EventEmitter } from 'events';
import {
  analyzeCommentDeterministic,
  NlpAnalysisResult,
  normalizeText,
  SentimentPolarity,
} from '../nlp/sportsLexicon.ts';

export const sparkEvents = new EventEmitter();

export interface RawCommentRecord {
  sportId: number;
  sportSlug: string;
  authorHandle?: string;
  rawText: string;
  commentedAt?: Date;
}

export interface StageMetric {
  stage: string;
  operation: string;
  inputCount: number;
  outputCount: number;
  durationMs: number;
}

export interface RddBatchOutput {
  records: Array<RawCommentRecord & { analysis: NlpAnalysisResult }>;
  sentimentTotals: Record<SentimentPolarity, number>;
  keywordFrequencies: Array<{ keyword: string; count: number; sportId: number }>;
  aspectGroups: Record<string, { count: number; avgScore: number }>;
  stageMetrics: StageMetric[];
  partitions: number;
  totalDurationMs: number;
}

/**
 * Partitioned RDD abstraction mirroring Apache Spark JavaRDD transformations:
 * filter(), map(), flatMap(), mapToPair(), reduceByKey(), groupByKey(), cache(), count(), collect()
 */
export class PartitionedRDD<T> {
  private partitions: T[][];
  private cached = false;

  private constructor(partitions: T[][]) {
    this.partitions = partitions;
  }

  static parallelize<U>(items: U[], numPartitions = 4): PartitionedRDD<U> {
    const count = Math.max(1, numPartitions);
    const buckets: U[][] = Array.from({ length: count }, () => []);
    items.forEach((item, index) => {
      buckets[index % count].push(item);
    });
    return new PartitionedRDD(buckets);
  }

  cache(): PartitionedRDD<T> {
    this.cached = true;
    return this;
  }

  isCached(): boolean {
    return this.cached;
  }

  filter(predicate: (item: T) => boolean): PartitionedRDD<T> {
    return new PartitionedRDD(this.partitions.map((p) => p.filter(predicate)));
  }

  map<U>(mapper: (item: T) => U): PartitionedRDD<U> {
    return new PartitionedRDD(this.partitions.map((p) => p.map(mapper)));
  }

  flatMap<U>(mapper: (item: T) => U[]): PartitionedRDD<U> {
    return new PartitionedRDD(this.partitions.map((p) => p.flatMap(mapper)));
  }

  mapToPair<K extends string | number, V>(mapper: (item: T) => [K, V]): PairRDD<K, V> {
    const pairs = this.partitions.map((p) => p.map(mapper));
    return new PairRDD(pairs);
  }

  count(): number {
    return this.partitions.reduce((sum, p) => sum + p.length, 0);
  }

  collect(): T[] {
    return this.partitions.flat();
  }

  getPartitionCount(): number {
    return this.partitions.length;
  }
}

export class PairRDD<K extends string | number, V> {
  private partitions: Array<Array<[K, V]>>;

  constructor(partitions: Array<Array<[K, V]>>) {
    this.partitions = partitions;
  }

  reduceByKey(reducer: (a: V, b: V) => V): Array<[K, V]> {
    const map = new Map<K, V>();
    for (const partition of this.partitions) {
      for (const [key, value] of partition) {
        if (map.has(key)) {
          map.set(key, reducer(map.get(key)!, value));
        } else {
          map.set(key, value);
        }
      }
    }
    return Array.from(map.entries());
  }

  groupByKey(): Array<[K, V[]]> {
    const map = new Map<K, V[]>();
    for (const partition of this.partitions) {
      for (const [key, value] of partition) {
        const list = map.get(key);
        if (list) list.push(value);
        else map.set(key, [value]);
      }
    }
    return Array.from(map.entries());
  }
}

export function emitJobProgress(payload: {
  jobUid: string;
  stage: string;
  progress: number;
  status: string;
  processedRecords: number;
  totalRecords: number;
  sportSlug?: string;
}) {
  sparkEvents.emit('job:progress', payload);
}

export function runSparkRddSentimentPipeline(
  rawComments: RawCommentRecord[],
  jobUid?: string,
  partitions = 4,
): RddBatchOutput {
  const startTotal = Date.now();
  const stageMetrics: StageMetric[] = [];
  const totalInput = rawComments.length;

  // Stage 1: parallelize() + filter() (valid non-empty comments, deduplicated by normalized text + sport)
  const t1 = Date.now();
  const rawRdd = PartitionedRDD.parallelize(rawComments, partitions);
  const seen = new Set<string>();
  const validRdd = rawRdd
    .filter((rec) => {
      const cleaned = normalizeText(rec.rawText);
      if (cleaned.length < 4) return false;
      const dedupKey = `${rec.sportId}:${cleaned}`;
      if (seen.has(dedupKey)) return false;
      seen.add(dedupKey);
      return true;
    })
    .cache();
  const validCount = validRdd.count();
  stageMetrics.push({
    stage: 'Stage 1: Ingestion & Deduplication',
    operation: 'parallelize().filter().cache()',
    inputCount: totalInput,
    outputCount: validCount,
    durationMs: Math.max(1, Date.now() - t1),
  });
  if (jobUid) {
    emitJobProgress({
      jobUid,
      stage: 'filter() — Cleaned & deduplicated RDD partitions',
      progress: 25,
      status: 'RUNNING',
      processedRecords: validCount,
      totalRecords: totalInput,
    });
  }

  // Stage 2: map() — Deterministic NLP Sentiment, Emotion, Keyword & Aspect extraction
  const t2 = Date.now();
  const analyzedRdd = validRdd
    .map((rec) => ({
      ...rec,
      analysis: analyzeCommentDeterministic(rec.rawText),
    }))
    .cache();
  const records = analyzedRdd.collect();
  stageMetrics.push({
    stage: 'Stage 2: NLP Classification',
    operation: 'map(analyzeCommentDeterministic).cache()',
    inputCount: validCount,
    outputCount: records.length,
    durationMs: Math.max(1, Date.now() - t2),
  });
  if (jobUid) {
    emitJobProgress({
      jobUid,
      stage: 'map() — Executed deterministic sports NLP & aspect scoring',
      progress: 55,
      status: 'RUNNING',
      processedRecords: records.length,
      totalRecords: totalInput,
    });
  }

  // Stage 3: mapToPair().reduceByKey() — Polarity aggregation
  const t3 = Date.now();
  const sentimentPairs = analyzedRdd
    .mapToPair((r) => [r.analysis.polarity, 1])
    .reduceByKey((a, b) => a + b);
  const sentimentTotals: Record<SentimentPolarity, number> = {
    POSITIVE: 0,
    NEGATIVE: 0,
    NEUTRAL: 0,
  };
  for (const [pol, cnt] of sentimentPairs) {
    sentimentTotals[pol] = cnt;
  }
  stageMetrics.push({
    stage: 'Stage 3: Polarity Aggregation',
    operation: 'mapToPair().reduceByKey()',
    inputCount: records.length,
    outputCount: sentimentPairs.length,
    durationMs: Math.max(1, Date.now() - t3),
  });

  // Stage 4: flatMap() + mapToPair().reduceByKey() — Keyword frequency reduction
  const t4 = Date.now();
  const keywordPairs = analyzedRdd
    .flatMap((r) =>
      r.analysis.keywords.map((kw) => ({
        key: `${r.sportId}::${kw.keyword}`,
        sportId: r.sportId,
        keyword: kw.keyword,
        count: kw.frequency,
      })),
    )
    .mapToPair((item) => [item.key, item.count])
    .reduceByKey((a, b) => a + b);

  const keywordFrequencies = keywordPairs
    .map(([compound, count]) => {
      const [sportStr, keyword] = compound.split('::');
      return { sportId: Number(sportStr), keyword, count };
    })
    .sort((a, b) => b.count - a.count);

  stageMetrics.push({
    stage: 'Stage 4: Keyword Token Reduction',
    operation: 'flatMap().mapToPair().reduceByKey()',
    inputCount: records.length,
    outputCount: keywordFrequencies.length,
    durationMs: Math.max(1, Date.now() - t4),
  });
  if (jobUid) {
    emitJobProgress({
      jobUid,
      stage: 'flatMap() + reduceByKey() — Aggregated keywords & polarities',
      progress: 80,
      status: 'RUNNING',
      processedRecords: records.length,
      totalRecords: totalInput,
    });
  }

  // Stage 5: flatMap() + mapToPair().groupByKey() — Aspect-based grouping
  const t5 = Date.now();
  const aspectGrouped = analyzedRdd
    .flatMap((r) => r.analysis.aspects)
    .mapToPair((a) => [a.aspectName, a.score])
    .groupByKey();

  const aspectGroups: Record<string, { count: number; avgScore: number }> = {};
  for (const [aspectName, scores] of aspectGrouped) {
    const avg = scores.reduce((acc, s) => acc + s, 0) / Math.max(1, scores.length);
    aspectGroups[aspectName] = {
      count: scores.length,
      avgScore: Number(avg.toFixed(1)),
    };
  }
  stageMetrics.push({
    stage: 'Stage 5: Aspect Grouping',
    operation: 'flatMap().mapToPair().groupByKey()',
    inputCount: records.length,
    outputCount: Object.keys(aspectGroups).length,
    durationMs: Math.max(1, Date.now() - t5),
  });

  return {
    records,
    sentimentTotals,
    keywordFrequencies,
    aspectGroups,
    stageMetrics,
    partitions,
    totalDurationMs: Math.max(4, Date.now() - startTotal),
  };
}
