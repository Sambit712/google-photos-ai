import { 
  MediaAssetContext, 
  MemoryEpisode, 
  TripContainer 
} from '../types/index.js';
import { GeoPOIEngine } from '../enrichment/geo-poi-engine.js';
import { determineTimeOfDayBucket } from '../enrichment/solar-temporal-engine.js';
import { SpatioTemporalClusterer, SpatioTemporalClusterConfig } from '../clustering/spatio-temporal-clusterer.js';
import { EpisodeSynthesizer } from '../clustering/episode-synthesizer.js';
import { MemoryStore } from '../db/memory-store.js';

export interface RawMediaInput {
  photoId: string;
  url: string;
  thumbnailUrl?: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  detectedPeople?: {
    personId: string;
    displayName: string;
    relationshipGroup: 'friends' | 'family' | 'colleagues' | 'solo' | 'other';
  }[];
  sceneTags?: string[];
  activityTags?: string[];
  caption?: string;
  visualEmbedding: number[];
  aestheticScore?: number;
}

export interface IngestionResult {
  enrichedPhotos: MediaAssetContext[];
  episodes: MemoryEpisode[];
  trips: TripContainer[];
}

export class IngestionPipeline {
  private geoEngine: GeoPOIEngine;
  private clusterer: SpatioTemporalClusterer;
  private synthesizer: EpisodeSynthesizer;

  constructor(clusterConfig?: Partial<SpatioTemporalClusterConfig>) {
    this.geoEngine = new GeoPOIEngine();
    this.clusterer = new SpatioTemporalClusterer(clusterConfig);
    this.synthesizer = new EpisodeSynthesizer();
  }

  /**
   * Runs the complete enrichment and spatio-temporal clustering pipeline
   */
  public processPhotos(rawPhotos: RawMediaInput[]): IngestionResult {
    // 1. Enrich raw photos with Reverse Geocoding & Solar Time Buckets
    const enrichedPhotos: MediaAssetContext[] = rawPhotos.map(raw => {
      const location = this.geoEngine.reverseGeocode({
        latitude: raw.latitude,
        longitude: raw.longitude
      });

      const timeOfDayBucket = determineTimeOfDayBucket(
        raw.latitude,
        raw.longitude,
        raw.timestamp
      );

      return {
        photoId: raw.photoId,
        url: raw.url,
        thumbnailUrl: raw.thumbnailUrl,
        timestamp: raw.timestamp,
        timeOfDayBucket,
        location,
        detectedPeople: (raw.detectedPeople || []).map(p => ({
          ...p,
          confidence: 0.95
        })),
        sceneTags: raw.sceneTags || [],
        activityTags: raw.activityTags || [],
        caption: raw.caption,
        visualEmbedding: raw.visualEmbedding,
        aestheticScore: raw.aestheticScore || 0.8,
        isKeyframeCandidate: (raw.aestheticScore || 0.8) >= 0.9
      };
    });

    // 2. Perform Spatio-Temporal Episode Segmentation
    const rawClusters = this.clusterer.clusterPhotos(enrichedPhotos);

    // 3. Synthesize Episodes & Group Trips
    const episodes: MemoryEpisode[] = [];
    const tripEpisodes: MemoryEpisode[] = [];

    const tripId = 'trip_goa_nov2023';

    for (const cluster of rawClusters) {
      const belongsToTrip = cluster.isTrip;
      const episode = this.synthesizer.synthesizeEpisode(
        cluster, 
        belongsToTrip ? tripId : undefined
      );
      episodes.push(episode);
      if (belongsToTrip) {
        tripEpisodes.push(episode);
      }
    }

    // 4. Synthesize TripContainer if trip episodes exist
    const trips: TripContainer[] = [];
    if (tripEpisodes.length > 0) {
      const trip = this.synthesizer.synthesizeTrip(tripId, tripEpisodes, 'Goa');
      trips.push(trip);
    }

    return { enrichedPhotos, episodes, trips };
  }

  /**
   * Processes photos and populates a MemoryStore instance
   */
  public ingestIntoStore(rawPhotos: RawMediaInput[], store: MemoryStore): IngestionResult {
    const result = this.processPhotos(rawPhotos);

    for (const trip of result.trips) store.addTrip(trip);
    for (const ep of result.episodes) store.addEpisode(ep);
    for (const photo of result.enrichedPhotos) store.addMediaAsset(photo);

    return result;
  }
}
