import express, { Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import { MemoryStore } from '../db/memory-store.js';
import { GroqIntentParser } from '../intent/groq-intent-parser.js';
import { QueryEmbedder } from '../intent/query-embedder.js';
import { ContextWindowBuilder } from '../services/context-window-builder.js';
import { MemoryCacheService, globalCache } from '../services/cache-service.js';
import { zeroTrustAuthMiddleware, AuthenticatedRequest } from './auth-middleware.js';
import { TimelineAnchorResponse } from '../types/timeline.js';
import { PrivacyAuditor } from '../privacy/privacy-auditor.js';
import { BenchmarkEvaluator } from '../evaluation/evaluator.js';
import { RolloutManager } from '../rollout/rollout-manager.js';

export interface ServerConfig {
  store: MemoryStore;
  intentParser?: GroqIntentParser;
  embedder?: QueryEmbedder;
  cache?: MemoryCacheService;
  rolloutManager?: RolloutManager;
}

export function createApiServer(config: ServerConfig): express.Express {
  const app = express();
  const store = config.store;
  const intentParser = config.intentParser || new GroqIntentParser();
  const embedder = config.embedder || new QueryEmbedder();
  const cache = config.cache || globalCache;
  const contextBuilder = new ContextWindowBuilder(store);
  const privacyAuditor = new PrivacyAuditor();
  const benchmarkEvaluator = new BenchmarkEvaluator(store);
  const rolloutManager = config.rolloutManager || new RolloutManager();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(process.cwd(), 'public')));


  // Health Check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      cacheSize: cache.size(),
      totalEpisodes: store.getAllEpisodes().length,
      totalTrips: store.getAllTrips().length
    });
  });

  // Zero-trust tenant boundary middleware for all /api/v1 routes
  app.use('/api/v1', zeroTrustAuthMiddleware);

  /**
   * POST /api/v1/memories/search
   * Primary Semantic Memory Discovery Endpoint
   */
  app.post('/api/v1/memories/search', async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      res.status(400).json({
        error: 'BadRequest',
        message: 'A non-empty "query" string parameter is required.'
      });
      return;
    }

    const totalStart = performance.now();
    const cleanQuery = query.trim();
    const cacheKey = `search:${authReq.userId}:${cleanQuery.toLowerCase()}`;

    // 1. Check Cache
    const cached = cache.get<TimelineAnchorResponse>(cacheKey);
    if (cached) {
      const latencyMs = Number((performance.now() - totalStart).toFixed(1));
      res.json({
        ...cached,
        metrics: {
          totalLatencyMs: latencyMs,
          cached: true
        }
      });
      return;
    }

    try {
      // 2. Groq Intent Extraction
      const parseStart = performance.now();
      const parseResult = await intentParser.parseIntent(cleanQuery);
      const parseLatencyMs = Number((performance.now() - parseStart).toFixed(1));

      // 3. Multi-modal query vector embedding
      const queryEmbedding = embedder.embedQuery(parseResult.intent);

      // 4. Hybrid Candidate Retrieval against MemoryStore
      const searchStart = performance.now();
      const rankedCandidates = store.searchEpisodes(queryEmbedding, parseResult.intent);
      const searchLatencyMs = Number((performance.now() - searchStart).toFixed(1));

      if (rankedCandidates.length === 0) {
        res.status(404).json({
          error: 'NotFound',
          message: `No memories found matching query: "${cleanQuery}"`
        });
        return;
      }

      // 5. Context Window Building (Micro, Meso, Macro)
      const queryId = `q_${Date.now()}`;
      const responseEnvelope = contextBuilder.buildContextEnvelope(
        queryId,
        parseResult.intent,
        rankedCandidates
      );

      const totalLatencyMs = Number((performance.now() - totalStart).toFixed(1));

      // Cache result for 1 hour
      cache.set(cacheKey, responseEnvelope, 60 * 60 * 1000);

      res.json({
        ...responseEnvelope,
        metrics: {
          totalLatencyMs,
          intentParseLatencyMs: parseLatencyMs,
          retrievalLatencyMs: searchLatencyMs,
          modelUsed: parseResult.modelUsed,
          cached: false
        }
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error during memory search';
      console.error('[API /memories/search Error]:', err);
      res.status(500).json({
        error: 'InternalServerError',
        message
      });
    }
  });

  /**
   * GET /api/v1/timeline/window
   * Timeline infinite scroll & dynamic zoom endpoint
   */
  app.get('/api/v1/timeline/window', (req: Request, res: Response): void => {
    const { centerDate, spanHours = 24, zoomLevel = 'episode' } = req.query;

    if (!centerDate || typeof centerDate !== 'string') {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Parameter "centerDate" (ISO 8601 string) is required.'
      });
      return;
    }

    const centerMs = new Date(centerDate).getTime();
    if (isNaN(centerMs)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid "centerDate" provided.'
      });
      return;
    }

    const spanMs = Number(spanHours) * 60 * 60 * 1000;
    const windowStartMs = centerMs - spanMs / 2;
    const windowEndMs = centerMs + spanMs / 2;

    // Filter matching episodes in window
    const matchingEpisodes = store.getAllEpisodes().filter(ep => {
      const startMs = new Date(ep.startTime).getTime();
      const endMs = new Date(ep.endTime).getTime();
      return (startMs >= windowStartMs && startMs <= windowEndMs) ||
             (endMs >= windowStartMs && endMs <= windowEndMs);
    });

    // Photos within window
    const windowPhotos = matchingEpisodes.flatMap(ep => store.getPhotosForEpisode(ep.id));

    res.json({
      windowStart: new Date(windowStartMs).toISOString(),
      windowEnd: new Date(windowEndMs).toISOString(),
      zoomLevel,
      episodesCount: matchingEpisodes.length,
      photosCount: windowPhotos.length,
      episodes: matchingEpisodes,
      photos: windowPhotos.slice(0, 100)
    });
  });

  /**
   * GET /api/v1/episodes/:id
   * Fetch specific episode details with full photo list
   */
  app.get('/api/v1/episodes/:id', (req: Request, res: Response): void => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const episode = store.getEpisode(id);
    if (!episode) {
      res.status(404).json({ error: 'NotFound', message: `Episode ${id} not found.` });
      return;
    }

    const photos = store.getPhotosForEpisode(episode.id);
    res.json({ episode, photos });
  });

  /**
   * GET /api/v1/trips/:id
   * Fetch specific trip details with constituent episodes
   */
  app.get('/api/v1/trips/:id', (req: Request, res: Response): void => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const trip = store.getTrip(id);
    if (!trip) {
      res.status(404).json({ error: 'NotFound', message: `Trip ${id} not found.` });
      return;
    }

    const constituentEpisodes = trip.episodeIds
      .map(id => store.getEpisode(id))
      .filter((ep): ep is NonNullable<typeof ep> => ep !== undefined);

    res.json({ trip, episodes: constituentEpisodes });
  });

  /**
   * GET /api/v1/evaluation/benchmark
   * Execute 100 natural language scenarios benchmark & compute Accuracy@1, Time-to-Relive, and latency SLA
   */
  app.get('/api/v1/evaluation/benchmark', async (_req: Request, res: Response): Promise<void> => {
    try {
      const report = await benchmarkEvaluator.runBenchmark();
      res.json(report);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Benchmark evaluation failed';
      res.status(500).json({ error: 'InternalServerError', message });
    }
  });

  /**
   * GET /api/v1/privacy/audit
   * Execute Privacy-by-Design and Zero-Trust tenant isolation compliance audit
   */
  app.get('/api/v1/privacy/audit', (_req: Request, res: Response): void => {
    try {
      const auditResult = privacyAuditor.runFullAudit(store);
      res.json(auditResult);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Privacy audit failed';
      res.status(500).json({ error: 'InternalServerError', message });
    }
  });

  /**
   * GET /api/v1/rollout/status
   * Evaluate user cohort assignment & active canary feature flags
   */
  app.get('/api/v1/rollout/status', (req: Request, res: Response): void => {
    const authReq = req as AuthenticatedRequest;
    const userEmail = typeof req.query.email === 'string' ? req.query.email : undefined;
    const evaluation = rolloutManager.evaluateUser(authReq.userId, userEmail);
    res.json(evaluation);
  });

  return app;
}

