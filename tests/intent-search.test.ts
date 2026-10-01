import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { GroqIntentParser } from '../src/intent/groq-intent-parser.js';
import { QueryEmbedder } from '../src/intent/query-embedder.js';
import { HybridSearchOrchestrator } from '../src/search/hybrid-search-orchestrator.js';
import { MemoryStore, cosineSimilarity } from '../src/db/memory-store.js';
import { FixtureData } from '../src/fixtures/generate-goa-fixture.js';

describe('Phase 2: Conversational Clue Parsing & Hybrid Retrieval Engine', () => {
  let store: MemoryStore;
  let orchestrator: HybridSearchOrchestrator;
  let parser: GroqIntentParser;
  let embedder: QueryEmbedder;

  beforeEach(() => {
    store = new MemoryStore();
    const fixturePath = path.join(process.cwd(), 'src', 'fixtures', 'goa-trip-fixture.json');
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    const fixture: FixtureData = JSON.parse(raw);

    for (const trip of fixture.trips) store.addTrip(trip);
    for (const ep of fixture.episodes) store.addEpisode(ep);
    for (const photo of fixture.photos) store.addMediaAsset(photo);

    parser = new GroqIntentParser();
    embedder = new QueryEmbedder();
    orchestrator = new HybridSearchOrchestrator(store, parser, embedder);
  });

  it('should parse natural memory clues into structured slot matrix', async () => {
    const query = 'those photos from Goa when we went to a café with friends in the evening';
    const result = await parser.parseIntent(query);

    expect(result.intent).toBeDefined();
    expect(result.intent.place.region).toBe('Goa');
    expect(result.intent.place.poiCategory).toBe('cafe');
    expect(result.intent.peopleGroup).toBe('friends');
    expect(result.intent.temporal.timeOfDay).toBe('evening');
    expect(result.intent.confidenceScore).toBeGreaterThanOrEqual(0.9);
  });

  it('should generate normalized 768-dim query vector aligned with target concept', async () => {
    const query = 'those photos from Goa when we went to a café with friends in the evening';
    const parseResult = await parser.parseIntent(query);
    const embedding = embedder.embedQuery(parseResult.intent);

    expect(embedding.length).toBe(768);

    // Verify L2 norm is ~1.0
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    expect(norm).toBeCloseTo(1.0, 3);

    // Verify high cosine similarity against target cafe episode centroid
    const targetEpisode = store.getEpisode('ep_anjuna_cafe_evening')!;
    const similarity = cosineSimilarity(embedding, targetEpisode.centroidEmbedding);
    expect(similarity).toBeGreaterThan(0.70);
  });

  it('should execute end-to-end hybrid retrieval and select "Evening at Beach Café in Anjuna" as Primary Anchor', async () => {
    const query = 'those photos from Goa when we went to a café with friends in the evening';

    const result = await orchestrator.searchAndResolveAnchor(query);

    const anchor = result.response.primaryAnchor;
    const context = result.response.contextWindow;

    // 1. Acceptance Criteria: #1 ranked anchor must be Anjuna café evening
    expect(anchor.episodeId).toBe('ep_anjuna_cafe_evening');
    expect(anchor.confidenceScore).toBeGreaterThan(0.90);
    expect(anchor.anchorPhoto).toBeDefined();
    expect(anchor.anchorPhoto.photoId).toBe('photo_goa_cafe_hero');

    // 2. Acceptance Criteria: Context window projection
    expect(context.parentTrip).toBeDefined();
    expect(context.parentTrip?.id).toBe('trip_goa_2023');
    expect(context.episodePhotos.length).toBe(85);
    expect(context.surroundingEpisodes.length).toBeGreaterThan(0);

    // 3. Acceptance Criteria: Vector & hybrid retrieval latency under 50ms
    expect(result.metrics.retrievalLatencyMs).toBeLessThan(50);
    console.log(`End-to-End Query Latency: ${result.metrics.totalLatencyMs}ms (Intent: ${result.metrics.intentParseLatencyMs}ms, Retrieval: ${result.metrics.retrievalLatencyMs}ms)`);
  });

  it('should accurately resolve alternative queries across diverse memories', async () => {
    // Scenario B: Sunset at Baga Beach
    const sunsetQuery = 'watching the sunset at Baga beach with friends';
    const sunsetResult = await orchestrator.searchAndResolveAnchor(sunsetQuery);
    expect(sunsetResult.response.primaryAnchor.episodeId).toBe('ep_baga_sunset');
    expect(sunsetResult.response.primaryAnchor.confidenceScore).toBeGreaterThan(0.70);

    // Scenario C: Old Goa Heritage Church Walk
    const churchQuery = 'morning walk around the old churches and basilica in Old Goa';
    const churchResult = await orchestrator.searchAndResolveAnchor(churchQuery);
    expect(churchResult.response.primaryAnchor.episodeId).toBe('ep_old_goa_heritage');
    expect(churchResult.response.primaryAnchor.confidenceScore).toBeGreaterThan(0.50);

    // Scenario D: Coffee at Home in Bangalore
    const homeQuery = 'morning filter coffee at home in Bangalore with family';
    const homeResult = await orchestrator.searchAndResolveAnchor(homeQuery);
    expect(homeResult.response.primaryAnchor.episodeId).toBe('ep_home_bangalore_coffee');
  }, 25000);
});
