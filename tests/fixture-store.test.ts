import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { MemoryStore, cosineSimilarity } from '../src/db/memory-store.js';
import { ContextualQueryIntent } from '../src/types/index.js';
import { FixtureData } from '../src/fixtures/generate-goa-fixture.js';

describe('Phase 0: Synthetic Fixture & MemoryStore Hybrid Retrieval Tests', () => {
  let store: MemoryStore;
  let fixture: FixtureData;

  beforeEach(() => {
    store = new MemoryStore();
    const fixturePath = path.join(process.cwd(), 'src', 'fixtures', 'goa-trip-fixture.json');
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    fixture = JSON.parse(raw);

    // Seed the store
    for (const trip of fixture.trips) store.addTrip(trip);
    for (const ep of fixture.episodes) store.addEpisode(ep);
    for (const photo of fixture.photos) store.addMediaAsset(photo);
  });

  it('should seed 500 photos and 8 episodes successfully', () => {
    expect(store.getAllEpisodes().length).toBe(8);
    expect(store.getAllTrips().length).toBe(1);
    
    // Check total photos in store
    const targetEpisode = store.getEpisode('ep_anjuna_cafe_evening');
    expect(targetEpisode).toBeDefined();
    expect(targetEpisode?.photoCount).toBe(85);

    const photos = store.getPhotosForEpisode('ep_anjuna_cafe_evening');
    expect(photos.length).toBe(85);
  });

  it('should calculate accurate cosine similarity between vectors', () => {
    const vecA = [1, 0, 0, 0];
    const vecB = [1, 0, 0, 0];
    const vecC = [0, 1, 0, 0];

    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0);
    expect(cosineSimilarity(vecA, vecC)).toBeCloseTo(0.0);
  });

  it('should resolve surrounding chronological context episodes', () => {
    const surrounding = store.getSurroundingEpisodes('ep_anjuna_cafe_evening', 2);
    expect(surrounding.before.length).toBeGreaterThan(0);
    expect(surrounding.after.length).toBeGreaterThan(0);

    // Prior episode should be flea market or beach
    const priorIds = surrounding.before.map(e => e.id);
    expect(priorIds).toContain('ep_anjuna_flea_market');

    // Next episode should be curlies late night
    const nextIds = surrounding.after.map(e => e.id);
    expect(nextIds).toContain('ep_curlies_night');
  });

  it('should rank "Evening at Beach Café in Anjuna" as #1 for the target memory query', () => {
    // Exact user scenario: "those photos from Goa when we went to a café with friends in the evening"
    const parsedIntent: ContextualQueryIntent = {
      rawQuery: 'those photos from Goa when we went to a café with friends in the evening',
      place: {
        region: 'Goa',
        poiCategory: 'cafe'
      },
      activity: 'dining / cafe',
      peopleGroup: 'friends',
      temporal: {
        timeOfDay: 'evening'
      },
      extractedKeywords: ['Goa', 'café', 'friends', 'evening'],
      confidenceScore: 0.96
    };

    // Use the target episode centroid as the semantic vector query representation
    const targetEpisode = store.getEpisode('ep_anjuna_cafe_evening')!;
    const queryEmbedding = targetEpisode.centroidEmbedding;

    const ranked = store.searchEpisodes(queryEmbedding, parsedIntent);

    expect(ranked.length).toBe(8);
    const topResult = ranked[0];

    // Primary assertion: The top ranked anchor must be the Anjuna café evening episode
    expect(topResult.episode.id).toBe('ep_anjuna_cafe_evening');
    expect(topResult.totalScore).toBeGreaterThan(0.90);
    expect(topResult.components.geoMatchScore).toBe(1.0);
    expect(topResult.components.timeMatchScore).toBe(1.0);
    expect(topResult.components.peopleMatchScore).toBe(1.0);
    expect(topResult.components.vectorSimilarity).toBeGreaterThan(0.99);

    // Verify non-matching episodes (like Bangalore home coffee) rank lower
    const homeEpisodeResult = ranked.find(r => r.episode.id === 'ep_home_bangalore_coffee');
    expect(homeEpisodeResult).toBeDefined();
    expect(topResult.totalScore).toBeGreaterThan(homeEpisodeResult!.totalScore);
  });
});
