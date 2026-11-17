import http from 'http';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  deleteCommentById,
  getAdminOverview,
  getCommentsPaginated,
  getFullAnalyticsBundle,
  getSportsListWithStats,
  ingestAndAnalyzeComments,
  updateUserRole,
} from './src/analytics/analyticsService.ts';
import { AuthRequest, optionalAuth, requireAuth, requireRole } from './src/middleware/auth.ts';
import { analyzeCommentDeterministic } from './src/nlp/sportsLexicon.ts';
import { sparkEvents } from './src/spark/rddPipeline.ts';
import { JAVA_SPARK_ACADEMIC_FILES } from './src/academic/javaSparkBundle.ts';
import { ensureSeededDatabase } from './src/ingestion/seedData.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Security & parsing middleware
app.use(cors());
app.use(express.json({ limit: '4mb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Simple per-IP rate limiter for heavy batch ingestion routes
const rateHits = new Map<string, { count: number; resetAt: number }>();
const rateLimit = (maxPerMinute = 40) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || 'local';
    const now = Date.now();
    const record = rateHits.get(ip);
    if (!record || record.resetAt < now) {
      rateHits.set(ip, { count: 1, resetAt: now + 60_000 });
      return next();
    }
    if (record.count >= maxPerMinute) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait before submitting more batches.' });
    }
    record.count++;
    next();
  };
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv' || ext === '.txt') cb(null, true);
    else cb(new Error('Only .csv and .txt files are allowed.'));
  },
});

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sportspulse-rdd-api', timestamp: new Date().toISOString() });
});

// Auth Sync & Profile
app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: req.dbUser });
});

app.post('/api/auth/sync', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: req.dbUser });
});

// Sports Catalog & Per-Sport Analytics
app.get('/api/sports', async (_req, res) => {
  try {
    const list = await getSportsListWithStats();
    res.json({ sports: list });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load sports catalog' });
  }
});

app.get('/api/sports/:slug/analytics', async (req, res) => {
  try {
    const granularity = (req.query.granularity as 'hours' | 'days' | 'weeks' | 'months') || 'days';
    const bundle = await getFullAnalyticsBundle({
      sportSlug: req.params.slug,
      granularity,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      sourceFilter: req.query.sourceFilter as 'all' | 'live' | 'demo' | undefined,
    });
    res.json(bundle);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load sport analytics' });
  }
});

// Analytics Endpoints
function parseFilter(query: express.Request['query']) {
  return {
    sportSlug: (query.sport as string) || 'all',
    granularity: ((query.granularity as string) || 'days') as 'hours' | 'days' | 'weeks' | 'months',
    dateFrom: query.dateFrom as string | undefined,
    dateTo: query.dateTo as string | undefined,
    sourceFilter: ((query.sourceFilter as string) || 'all') as 'all' | 'live' | 'demo',
  };
}

app.get('/api/analytics/bundle', async (req, res) => {
  try {
    const bundle = await getFullAnalyticsBundle(parseFilter(req.query));
    res.json(bundle);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load analytics bundle' });
  }
});

app.get('/api/analytics/overview', async (req, res) => {
  try {
    const bundle = await getFullAnalyticsBundle(parseFilter(req.query));
    res.json(bundle.kpis);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load overview KPIs' });
  }
});

app.get('/api/analytics/sentiment-distribution', async (req, res) => {
  try {
    const bundle = await getFullAnalyticsBundle(parseFilter(req.query));
    res.json({ distribution: bundle.distribution });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load distribution' });
  }
});

app.get('/api/analytics/sentiment-trends', async (req, res) => {
  try {
    const bundle = await getFullAnalyticsBundle(parseFilter(req.query));
    res.json({ trends: bundle.trends });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load trends' });
  }
});

app.get('/api/analytics/sports-comparison', async (req, res) => {
  try {
    const bundle = await getFullAnalyticsBundle(parseFilter(req.query));
    res.json({ sportsComparison: bundle.sportsComparison });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load comparison' });
  }
});

app.get('/api/analytics/emotions', async (req, res) => {
  try {
    const bundle = await getFullAnalyticsBundle(parseFilter(req.query));
    res.json({ emotionsRadar: bundle.emotionsRadar });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load emotions' });
  }
});

app.get('/api/analytics/keywords', async (req, res) => {
  try {
    const bundle = await getFullAnalyticsBundle(parseFilter(req.query));
    res.json({ keywords: bundle.topKeywords });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load keywords' });
  }
});

app.get('/api/analytics/aspects', async (req, res) => {
  try {
    const bundle = await getFullAnalyticsBundle(parseFilter(req.query));
    res.json({ aspectAnalysis: bundle.aspectAnalysis });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load aspects' });
  }
});

app.get('/api/analytics/heatmap', async (req, res) => {
  try {
    const bundle = await getFullAnalyticsBundle(parseFilter(req.query));
    res.json({ heatmap: bundle.heatmap });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load heatmap' });
  }
});

// Comments Listing & Deletion
app.get('/api/comments', async (req, res) => {
  try {
    const result = await getCommentsPaginated({
      sportSlug: (req.query.sport as string) || 'all',
      polarity: (req.query.polarity as string) || 'ALL',
      search: (req.query.search as string) || '',
      page: Number(req.query.page || 1),
      pageSize: Number(req.query.pageSize || 12),
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch comments' });
  }
});

app.delete('/api/comments/:id', requireAuth, requireRole(['ADMIN', 'ANALYST']), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid comment ID' });
    const deleted = await deleteCommentById(id, req.dbUser?.email || 'analyst');
    if (!deleted) return res.status(404).json({ error: 'Comment not found' });
    res.json({ deleted });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete comment' });
  }
});

// Deterministic NLP Preview (stateless CPU evaluation)
app.post('/api/analysis/preview', rateLimit(60), (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (text.length < 3) {
    return res.status(400).json({ error: 'Please enter at least 3 characters to analyze.' });
  }
  if (text.length > 2000) {
    return res.status(400).json({ error: 'Comment exceeds 2000 character limit.' });
  }
  const analysis = analyzeCommentDeterministic(text);
  res.json({ analysis });
});

// Persistent Spark RDD Single & Batch Ingestion (Authenticated)
app.post('/api/analysis/sentiment', requireAuth, rateLimit(40), async (req: AuthRequest, res) => {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const sportSlug = typeof req.body?.sportSlug === 'string' ? req.body.sportSlug : 'cricket';
    if (text.length < 3) {
      return res.status(400).json({ error: 'Comment must be at least 3 characters.' });
    }
    const output = await ingestAndAnalyzeComments({
      sportSlug,
      texts: [text],
      sourceSlug: 'manual-entry',
      userId: req.dbUser?.id,
      actorEmail: req.dbUser?.email,
      authorHandle: `@${(req.dbUser?.displayName || 'analyst').toLowerCase().replace(/\s+/g, '_')}`,
    });
    res.status(201).json(output);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Sentiment analysis job failed' });
  }
});

app.post('/api/analysis/batch', requireAuth, rateLimit(25), async (req: AuthRequest, res) => {
  try {
    const sportSlug = typeof req.body?.sportSlug === 'string' ? req.body.sportSlug : 'cricket';
    const sourceSlug = typeof req.body?.sourceSlug === 'string' ? req.body.sourceSlug : 'manual-entry';
    const rawComments: unknown = req.body?.comments;
    const texts = Array.isArray(rawComments)
      ? rawComments.map((c) => String(c).trim()).filter((c) => c.length >= 4)
      : [];

    if (texts.length === 0) {
      return res.status(400).json({ error: 'Provide at least one valid comment (min 4 characters).' });
    }
    if (texts.length > 500) {
      return res.status(400).json({ error: 'Batch size capped at 500 comments per Spark job.' });
    }

    const output = await ingestAndAnalyzeComments({
      sportSlug,
      texts,
      sourceSlug,
      userId: req.dbUser?.id,
      actorEmail: req.dbUser?.email,
    });
    res.status(201).json(output);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Batch Spark RDD job failed' });
  }
});

app.post('/api/comments/upload', requireAuth, rateLimit(20), upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No .csv or .txt file uploaded.' });
    }
    const sportSlug = typeof req.body?.sportSlug === 'string' ? req.body.sportSlug : 'cricket';
    const ext = path.extname(req.file.originalname).toLowerCase();
    const rawContent = req.file.buffer.toString('utf-8');
    const lines = rawContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 4);

    // Strip header row if CSV starts with "comment" / "text"
    const cleanedLines =
      ext === '.csv' && lines.length > 1 && /^(comment|text|review|message)/i.test(lines[0])
        ? lines.slice(1)
        : lines;

    const extracted = cleanedLines
      .map((line) => {
        if (ext === '.csv') {
          const quotedMatch = line.match(/^"([^"]+)"/);
          if (quotedMatch && quotedMatch[1]) {
            return quotedMatch[1].trim();
          }
          const cols = line.split(',');
          return (cols[0] || '').replace(/^"|"$/g, '').trim();
        }
        return line;
      })
      .filter((t) => t.length >= 4)
      .slice(0, 500);

    if (extracted.length === 0) {
      return res.status(400).json({ error: 'Uploaded file contained no valid comment lines.' });
    }

    const output = await ingestAndAnalyzeComments({
      sportSlug,
      texts: extracted,
      sourceSlug: ext === '.csv' ? 'csv-upload' : 'txt-upload',
      userId: req.dbUser?.id,
      actorEmail: req.dbUser?.email,
    });
    res.status(201).json(output);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'File upload ingestion failed' });
  }
});

// CSV Export
app.get('/api/reports/export/csv', async (req, res) => {
  try {
    const bundle = await getFullAnalyticsBundle(parseFilter(req.query));
    const header = 'CommentID,Sport,Polarity,Score,Confidence,DominantEmotion,Source,IsDemo,CommentedAt,Comment\n';
    const rows = bundle.recentComments
      .map((c) => {
        const escaped = `"${c.rawText.replace(/"/g, '""')}"`;
        return `${c.commentId},${c.sportName},${c.polarity},${c.score},${c.confidence},${c.dominantEmotion},"${c.sourceName}",${c.isDemo},${c.commentedAt.toISOString()},${escaped}`;
      })
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sportspulse_sentiment_report.csv"');
    res.send(header + rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'CSV export failed' });
  }
});

// Real-Time Server-Sent Events (SSE) for Spark RDD Jobs & Analytics Updates
app.get('/api/stream/jobs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const onProgress = (data: unknown) => {
    res.write(`event: job:progress\ndata: ${JSON.stringify(data)}\n\n`);
  };
  const onAnalytics = (data: unknown) => {
    res.write(`event: analytics:updated\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sparkEvents.on('job:progress', onProgress);
  sparkEvents.on('analytics:updated', onAnalytics);

  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sparkEvents.off('job:progress', onProgress);
    sparkEvents.off('analytics:updated', onAnalytics);
  });
});

// Admin & Academic Endpoints
app.get('/api/admin/overview', optionalAuth, async (_req, res) => {
  try {
    const overview = await getAdminOverview();
    res.json(overview);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load admin overview' });
  }
});

app.patch('/api/admin/users/:id/role', requireAuth, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const roleName = String(req.body?.roleName || '').toUpperCase();
    if (!['ADMIN', 'ANALYST', 'USER'].includes(roleName)) {
      return res.status(400).json({ error: 'Role must be ADMIN, ANALYST, or USER' });
    }
    const updated = await updateUserRole(id, roleName, req.dbUser?.email || 'admin');
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json({ user: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update user role' });
  }
});

app.post('/api/admin/reseed', requireAuth, requireRole(['ADMIN']), async (_req, res) => {
  try {
    await ensureSeededDatabase();
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Seed failed' });
  }
});

app.get('/api/academic/files', (_req, res) => {
  res.json({ files: JAVA_SPARK_ACADEMIC_FILES });
});

app.get('/api/openapi.json', (_req, res) => {
  res.json({
    openapi: '3.0.3',
    info: {
      title: 'SportsPulse RDD — Big Data Sports Sentiment API',
      version: '1.0.0',
      description: 'REST API for deterministic sports NLP, Spark RDD batch jobs, PostgreSQL analytics, and report exports.',
    },
    paths: {
      '/api/sports': { get: { summary: 'List all 8 sports with sentiment percentages' } },
      '/api/analytics/bundle': { get: { summary: 'Fetch synchronized data for all 18 analytics visualizations' } },
      '/api/analysis/preview': { post: { summary: 'Stateless deterministic sports NLP preview' } },
      '/api/analysis/sentiment': { post: { summary: 'Authenticated single-comment Spark RDD job' } },
      '/api/analysis/batch': { post: { summary: 'Authenticated multi-comment Spark RDD batch job' } },
      '/api/comments/upload': { post: { summary: 'Upload CSV/TXT dataset for Spark RDD ingestion' } },
      '/api/stream/jobs': { get: { summary: 'Server-Sent Events stream for real-time RDD job telemetry' } },
      '/api/reports/export/csv': { get: { summary: 'Download CSV sentiment report' } },
    },
  });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled API error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        port: PORT,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`SportsPulse RDD server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
