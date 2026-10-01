import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { createApiServer } from '../src/api/server.js';
import { MemoryStore } from '../src/db/memory-store.js';
import { MemoryCacheService } from '../src/services/cache-service.js';
import { FixtureData } from '../src/fixtures/generate-goa-fixture.js';
import { TimelineAnchorResponseSchema } from '../src/types/timeline.js';

describe('Phase 3: Backend REST API & Context Window Projection', () => {
  let app: ReturnType<typeof createApiServer>;
  let store: MemoryStore;
  let cache: MemoryCacheService;

  beforeEach(() => {
    store = new MemoryStore();
    cache = new MemoryCacheService();

    const fixturePath = path.join(process.cwd(), 'src', 'fixtures', 'goa-trip-fixture.json');
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    const fixture: FixtureData = JSON.parse(raw);

    for (const trip of fixture.trips) store.addTrip(trip);
    for (const ep of fixture.episodes) store.addEpisode(ep);
    for (const photo of fixture.photos) store.addMediaAsset(photo);

    app = createApiServer({ store, cache });
  });

  it('GET /health - should return healthy system status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.totalEpisodes).toBe(8);
    expect(res.body.totalTrips).toBe(1);
  });

  it('POST /api/v1/memories/search - should execute full search and return complete context window envelope', async () => {
    const query = 'those photos from Goa when we went to a café with friends in the evening';

    const res = await request(app)
      .post('/api/v1/memories/search')
      .set('x-user-id', 'test_user_goa')
      .send({ query });

    expect(res.status).toBe(200);

    // Validate strict schema conformance
    const parseCheck = TimelineAnchorResponseSchema.safeParse(res.body);
    expect(parseCheck.success).toBe(true);

    const data = res.body;

    // 1. Primary Anchor verification
    expect(data.primaryAnchor.episodeId).toBe('ep_anjuna_cafe_evening');
    expect(data.primaryAnchor.confidenceScore).toBeGreaterThan(0.90);
    expect(data.primaryAnchor.anchorPhoto).toBeDefined();
    expect(data.primaryAnchor.anchorPhoto.photoId).toBe('photo_goa_cafe_hero');

    // 2. Timeline Coordinates
    expect(data.primaryAnchor.timelinePosition.year).toBe(2023);
    expect(data.primaryAnchor.timelinePosition.month).toBe(11);
    expect(data.primaryAnchor.timelinePosition.day).toBe(17);
    expect(data.primaryAnchor.timelinePosition.normalizedPosition).toBeGreaterThan(0);

    // 3. Micro-Window (Episode Photos)
    expect(data.contextWindow.episodePhotos.length).toBe(85);

    // 4. Meso-Window (Surrounding Episodes within ±12h)
    expect(data.contextWindow.surroundingEpisodes.length).toBeGreaterThan(0);
    const relativeLabels = data.contextWindow.surroundingEpisodes.map((e: { relativeLabel: string }) => e.relativeLabel);
    expect(relativeLabels.some((l: string) => l.includes('earlier') || l.includes('after'))).toBe(true);

    // 5. Macro-Window (Parent Trip)
    expect(data.contextWindow.parentTrip).toBeDefined();
    expect(data.contextWindow.parentTrip.id).toBe('trip_goa_2023');
    expect(data.contextWindow.parentTrip.title).toContain('Trip to Goa');

    // 6. Test Cache Acceleration on second identical request
    const cacheStart = performance.now();
    const cachedRes = await request(app)
      .post('/api/v1/memories/search')
      .set('x-user-id', 'test_user_goa')
      .send({ query });
    const cacheDuration = performance.now() - cacheStart;

    expect(cachedRes.status).toBe(200);
    expect(cachedRes.body.metrics.cached).toBe(true);
    expect(cacheDuration).toBeLessThan(50); // Sub-50ms cache retrieval SLA
  }, 20000);

  it('GET /api/v1/timeline/window - should return surrounding photos and episodes for infinite scroll', async () => {
    const res = await request(app)
      .get('/api/v1/timeline/window')
      .set('x-user-id', 'test_user_goa')
      .query({
        centerDate: '2023-11-17T15:00:00Z',
        spanHours: 24,
        zoomLevel: 'episode'
      });

    expect(res.status).toBe(200);
    expect(res.body.episodesCount).toBeGreaterThan(0);
    expect(res.body.photosCount).toBeGreaterThan(0);
    expect(res.body.episodes.some((e: { id: string }) => e.id === 'ep_anjuna_cafe_evening')).toBe(true);
  });

  it('GET /api/v1/episodes/:id - should fetch specific episode and its constituent photos', async () => {
    const res = await request(app)
      .get('/api/v1/episodes/ep_anjuna_cafe_evening')
      .set('x-user-id', 'test_user_goa');

    expect(res.status).toBe(200);
    expect(res.body.episode.title).toContain('Anjuna');
    expect(res.body.photos.length).toBe(85);
  });

  it('GET /api/v1/trips/:id - should fetch trip details and constituent episodes', async () => {
    const res = await request(app)
      .get('/api/v1/trips/trip_goa_2023')
      .set('x-user-id', 'test_user_goa');

    expect(res.status).toBe(200);
    expect(res.body.trip.title).toContain('Trip to Goa');
    expect(res.body.episodes.length).toBeGreaterThan(0);
  });

  it('POST /api/v1/memories/search - should return 400 for empty queries', async () => {
    const res = await request(app)
      .post('/api/v1/memories/search')
      .set('x-user-id', 'test_user_goa')
      .send({ query: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('BadRequest');
  });
});
