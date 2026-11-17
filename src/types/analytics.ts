export type AppView =
  | 'landing'
  | 'dashboard'
  | 'sports'
  | 'workbench'
  | 'analytics'
  | 'reports'
  | 'admin'
  | 'about';

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  roleId: number;
  roleName: 'ADMIN' | 'ANALYST' | 'USER' | string;
}

export interface SportWithStats {
  id: number;
  slug: string;
  name: string;
  category: string;
  description: string;
  imagePath: string;
  accentColor: string;
  isActive: boolean;
  totalComments: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  avgScore: number;
  trendingTopics: string[];
}

export interface AnalyticsKpis {
  totalComments: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  overallSentimentScore: number;
  mostDiscussedSport: string;
  mostTrendingKeyword: string;
  dominantEmotion: string;
}

export interface SportComparisonRow {
  sportId: number;
  slug: string;
  sport: string;
  accentColor: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  avgScore: number;
}

export interface CommentRecord {
  commentId: number;
  sportId: number;
  sportName: string;
  sportSlug: string;
  accentColor: string;
  sourceName: string;
  sourceType: string;
  isDemo: boolean;
  authorHandle: string;
  rawText: string;
  tokenCount: number;
  commentedAt: string;
  polarity: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number;
  confidence: number;
  matchedTokens: string[];
  joy: number;
  anger: number;
  sadness: number;
  excitement: number;
  fear: number;
  surprise: number;
  dominantEmotion: string;
}

export interface AnalyticsBundle {
  kpis: AnalyticsKpis;
  distribution: Array<{ name: string; value: number; color: string }>;
  trends: Array<{
    bucket: string;
    positive: number;
    negative: number;
    neutral: number;
    volume: number;
    avgScore: number;
  }>;
  sportsComparison: SportComparisonRow[];
  emotionsRadar: Array<{ emotion: string; value: number }>;
  topKeywords: Array<{ keyword: string; count: number; value: number; polarity: string }>;
  heatmap: {
    buckets: string[];
    sports: string[];
    cells: Array<{ sport: string; bucket: string; score: number; count: number }>;
  };
  aspectAnalysis: Array<{
    aspect: string;
    positive: number;
    negative: number;
    neutral: number;
    avgScore: number;
    total: number;
  }>;
  correlationScatter: Array<{ sport: string; volume: number; avgScore: number }>;
  scoreHistogram: Array<{
    range: string;
    count: number;
    zone: 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE';
  }>;
  emotionPie: Array<{ name: string; value: number; color: string }>;
  sportBoxPlots: Array<{
    sport: string;
    stats: [number, number, number, number, number];
    count: number;
  }>;
  sportViolins: Array<{
    sport: string;
    accentColor: string;
    count: number;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    kde: Array<{ y: number; density: number }>;
  }>;
  bubbleData: Array<{
    sport: string;
    volume: number;
    avgScore: number;
    avgConfidence: number;
    positivePct: number;
    accentColor: string;
  }>;
  recentComments: CommentRecord[];
}

export interface AnalyticsFilterState {
  sport: string;
  granularity: 'hours' | 'days' | 'weeks' | 'months';
  sourceFilter: 'all' | 'live' | 'demo';
  dateFrom: string;
  dateTo: string;
}

export interface SparkJobProgressEvent {
  jobUid: string;
  stage: string;
  progress: number;
  status: string;
  processedRecords: number;
  totalRecords: number;
  sportSlug?: string;
}
