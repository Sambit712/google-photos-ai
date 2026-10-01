import { MediaAssetContext } from '../types/media.js';
import { haversineDistanceMeters } from '../enrichment/geo-poi-engine.js';

export interface SpatioTemporalClusterConfig {
  maxSpatialGapMeters: number;    // Maximum distance between adjacent photos in an episode (e.g. 1200m)
  maxTemporalGapSeconds: number;  // Maximum time delta between consecutive photos in an episode (e.g. 7200s / 2 hours)
  minPhotosPerEpisode: number;    // Minimum photos to form an episode (e.g. 3)
  homeCoordinates: { latitude: number; longitude: number };
  homeRadiusMeters: number;       // Distance beyond which photos count as "Trip/Away" (e.g. 50,000m / 50km)
}

export const DEFAULT_CLUSTER_CONFIG: SpatioTemporalClusterConfig = {
  maxSpatialGapMeters: 1200,
  maxTemporalGapSeconds: 2 * 60 * 60, // 2 hours
  minPhotosPerEpisode: 3,
  homeCoordinates: { latitude: 12.9716, longitude: 77.5946 }, // Bangalore
  homeRadiusMeters: 50000 // 50 km
};

export interface RawPhotoCluster {
  clusterId: string;
  startTime: string;
  endTime: string;
  photos: MediaAssetContext[];
  isTrip: boolean;
}

export class SpatioTemporalClusterer {
  private config: SpatioTemporalClusterConfig;

  constructor(config: Partial<SpatioTemporalClusterConfig> = {}) {
    this.config = { ...DEFAULT_CLUSTER_CONFIG, ...config };
  }

  /**
   * Performs Density-Based Spatio-Temporal Segmentation on unclustered photos
   */
  public clusterPhotos(photos: MediaAssetContext[]): RawPhotoCluster[] {
    if (photos.length === 0) return [];

    // 1. Sort photos chronologically
    const sorted = [...photos].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const clusters: RawPhotoCluster[] = [];
    let currentBatch: MediaAssetContext[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prevPhoto = sorted[i - 1];
      const currPhoto = sorted[i];

      const prevTime = new Date(prevPhoto.timestamp).getTime() / 1000;
      const currTime = new Date(currPhoto.timestamp).getTime() / 1000;
      const timeDeltaSec = currTime - prevTime;

      const spatialDeltaMeters = haversineDistanceMeters(
        prevPhoto.location.coordinates,
        currPhoto.location.coordinates
      );

      // Check temporal, spatial and experiential continuity
      const isSameTimeOfDay = prevPhoto.timeOfDayBucket === currPhoto.timeOfDayBucket;
      const isWithinTime = timeDeltaSec <= this.config.maxTemporalGapSeconds;
      const isWithinSpace = spatialDeltaMeters <= this.config.maxSpatialGapMeters;
      const isNoticeableGap = timeDeltaSec > 1800; // > 30 min gap
      const isCategoryChange = prevPhoto.location.poiCategory !== currPhoto.location.poiCategory && (isNoticeableGap || spatialDeltaMeters > 250);
      const isTimeBucketChange = !isSameTimeOfDay && isNoticeableGap;

      if (isWithinTime && isWithinSpace && !isCategoryChange && !isTimeBucketChange) {
        currentBatch.push(currPhoto);
      } else {
        // Finalize current episode
        if (currentBatch.length >= this.config.minPhotosPerEpisode) {
          clusters.push(this.createCluster(currentBatch, clusters.length + 1));
        } else if (clusters.length > 0) {
          // Merge tiny outliers into nearest preceding cluster if temporally close
          clusters[clusters.length - 1].photos.push(...currentBatch);
        } else {
          clusters.push(this.createCluster(currentBatch, clusters.length + 1));
        }
        currentBatch = [currPhoto];
      }
    }

    // Flush last batch
    if (currentBatch.length > 0) {
      if (currentBatch.length >= this.config.minPhotosPerEpisode || clusters.length === 0) {
        clusters.push(this.createCluster(currentBatch, clusters.length + 1));
      } else {
        clusters[clusters.length - 1].photos.push(...currentBatch);
      }
    }

    return clusters;
  }

  private createCluster(photos: MediaAssetContext[], index: number): RawPhotoCluster {
    const startTime = photos[0].timestamp;
    const endTime = photos[photos.length - 1].timestamp;

    // Check if cluster is away from home location (> 50km)
    const avgLat = photos.reduce((acc, p) => acc + p.location.coordinates.latitude, 0) / photos.length;
    const avgLon = photos.reduce((acc, p) => acc + p.location.coordinates.longitude, 0) / photos.length;
    
    const distFromHome = haversineDistanceMeters(
      { latitude: avgLat, longitude: avgLon },
      this.config.homeCoordinates
    );

    const isTrip = distFromHome > this.config.homeRadiusMeters;

    return {
      clusterId: `cluster_${index.toString().padStart(3, '0')}`,
      startTime,
      endTime,
      photos,
      isTrip
    };
  }
}
