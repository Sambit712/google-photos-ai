import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { 
  determineTimeOfDayBucket, 
  calculateSolarElevation 
} from '../src/enrichment/solar-temporal-engine.js';
import { 
  GeoPOIEngine, 
  haversineDistanceMeters 
} from '../src/enrichment/geo-poi-engine.js';
import { 
  IngestionPipeline, 
  RawMediaInput 
} from '../src/pipeline/ingestion-pipeline.js';
import { MemoryStore } from '../src/db/memory-store.js';
import { FixtureData } from '../src/fixtures/generate-goa-fixture.js';

describe('Phase 1: Enrichment & Spatio-Temporal Episode Clustering', () => {
  const geoEngine = new GeoPOIEngine();

  it('should accurately calculate solar elevation and classify time-of-day buckets', () => {
    const goaLat = 15.5828;
    const goaLon = 73.7431;

    // Noon in Goa (around 12:30 local = 07:00 UTC) -> Sun high above horizon
    const noonBucket = determineTimeOfDayBucket(goaLat, goaLon, '2023-11-17T07:00:00Z');
    expect(['morning', 'afternoon']).toContain(noonBucket);

    // Evening dinner time in Goa (around 19:30 local = 14:00 UTC) -> Evening
    const eveningBucket = determineTimeOfDayBucket(goaLat, goaLon, '2023-11-17T14:00:00Z');
    expect(eveningBucket).toBe('evening');

    // Midnight in Goa (around 01:30 local = 20:00 UTC) -> Night
    const nightBucket = determineTimeOfDayBucket(goaLat, goaLon, '2023-11-17T20:00:00Z');
    expect(nightBucket).toBe('night');
  });

  it('should reverse geocode known POIs and calculate accurate distances', () => {
    const anjunaCafeCoord = { latitude: 15.5828, longitude: 73.7431 };
    const loc = geoEngine.reverseGeocode(anjunaCafeCoord);

    expect(loc.state).toBe('Goa');
    expect(loc.city).toBe('Anjuna');
    expect(loc.poiCategory).toBe('cafe');
    expect(loc.poiName).toBe('Café Lilliput Beachside');

    // Distance between Anjuna and Baga (~3.2 km)
    const bagaCoord = { latitude: 15.5553, longitude: 73.7517 };
    const distMeters = haversineDistanceMeters(anjunaCafeCoord, bagaCoord);
    expect(distMeters).toBeGreaterThan(2500);
    expect(distMeters).toBeLessThan(4500);
  });

  it('should run end-to-end clustering on 500 unclustered photos and synthesize episodes and trips', () => {
    // Load raw photos from fixture
    const fixturePath = path.join(process.cwd(), 'src', 'fixtures', 'goa-trip-fixture.json');
    const fixture: FixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

    // Strip pre-existing episode and trip assignments to test pure clustering
    const rawInputs: RawMediaInput[] = fixture.photos.map(p => ({
      photoId: p.photoId,
      url: p.url,
      thumbnailUrl: p.thumbnailUrl,
      timestamp: p.timestamp,
      latitude: p.location.coordinates.latitude,
      longitude: p.location.coordinates.longitude,
      detectedPeople: p.detectedPeople,
      sceneTags: p.sceneTags,
      activityTags: p.activityTags,
      caption: p.caption,
      visualEmbedding: p.visualEmbedding,
      aestheticScore: p.aestheticScore
    }));

    const pipeline = new IngestionPipeline();
    const memoryStore = new MemoryStore();

    const startTime = performance.now();
    const result = pipeline.ingestIntoStore(rawInputs, memoryStore);
    const durationMs = performance.now() - startTime;

    console.log(`Clustered ${rawInputs.length} photos into ${result.episodes.length} episodes and ${result.trips.length} trips in ${durationMs.toFixed(1)}ms`);

    // 1. Verify Macro Trip is formed
    expect(result.trips.length).toBe(1);
    const goaTrip = result.trips[0];
    expect(goaTrip.title).toContain('Trip to Goa');
    expect(goaTrip.startDate).toBe('2023-11-16');
    expect(goaTrip.endDate).toBe('2023-11-19');
    expect(goaTrip.totalPhotos).toBeGreaterThan(400);

    // 2. Verify Episodes are synthesized with anchor keyframes
    expect(result.episodes.length).toBeGreaterThanOrEqual(7);

    // Check that every episode has an anchor keyframe, valid centroid embedding, and photo IDs
    for (const ep of result.episodes) {
      expect(ep.anchorPhotoId).toBeDefined();
      expect(ep.photoIds.length).toBeGreaterThan(0);
      expect(ep.centroidEmbedding.length).toBe(768);
      expect(ep.coherenceScore).toBeGreaterThan(0.6);
    }

    const cafeEpisode = result.episodes.find(ep => 
      ep.location.city === 'Anjuna' && 
      ep.location.poiCategory === 'cafe' &&
      ep.timeOfDayBucket === 'evening'
    );

    expect(cafeEpisode).toBeDefined();
    if (cafeEpisode) {
      expect(cafeEpisode.participants.length).toBeGreaterThan(0);
      expect(cafeEpisode.activityTags.length).toBeGreaterThan(0);
      // Hero photo should be designated
      expect(cafeEpisode.anchorPhotoId).toBeDefined();
    }

    // 4. Test sub-10ms retrieval latency for episode centroid in memoryStore
    const queryCentroid = cafeEpisode!.centroidEmbedding;
    const lookupStart = performance.now();
    const searchResults = memoryStore.searchEpisodes(queryCentroid);
    const lookupDuration = performance.now() - lookupStart;

    expect(lookupDuration).toBeLessThan(10); // < 10ms SLA
    expect(searchResults[0].episode.id).toBe(cafeEpisode!.id);
  });
});
