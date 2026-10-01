import { 
  MediaAssetContext, 
  MemoryEpisode, 
  TripContainer, 
  DetectedPerson 
} from '../types/index.js';
import { RawPhotoCluster } from './spatio-temporal-clusterer.js';
import { cosineSimilarity } from '../db/memory-store.js';

export class EpisodeSynthesizer {
  /**
   * Synthesizes a RawPhotoCluster into a fully enriched MemoryEpisode
   */
  public synthesizeEpisode(cluster: RawPhotoCluster, tripId?: string): MemoryEpisode {
    const photos = cluster.photos;
    if (photos.length === 0) {
      throw new Error(`Cannot synthesize empty photo cluster: ${cluster.clusterId}`);
    }

    // 1. Compute Centroid Embedding
    const dim = photos[0].visualEmbedding.length;
    const sumVec = new Array(dim).fill(0);

    for (const photo of photos) {
      for (let i = 0; i < dim; i++) {
        sumVec[i] += photo.visualEmbedding[i];
      }
    }

    let norm = 0;
    for (let i = 0; i < dim; i++) {
      sumVec[i] /= photos.length;
      norm += sumVec[i] * sumVec[i];
    }
    const mag = Math.sqrt(norm);
    const centroidEmbedding = sumVec.map(val => Number((val / (mag || 1)).toFixed(6)));

    // 2. Select Primary Anchor Keyframe Photo
    // Score = aestheticScore (0.4) + vectorSimToCentroid (0.4) + facePresence (0.2)
    let bestPhoto = photos[0];
    let maxKeyframeScore = -1;

    for (const photo of photos) {
      const simToCentroid = cosineSimilarity(photo.visualEmbedding, centroidEmbedding);
      const faceBonus = photo.detectedPeople.length > 0 ? 0.2 : 0;
      const keyframeScore = (photo.aestheticScore * 0.4) + (simToCentroid * 0.4) + faceBonus;

      if (keyframeScore > maxKeyframeScore) {
        maxKeyframeScore = keyframeScore;
        bestPhoto = photo;
      }
    }

    // 3. Aggregate unique participants
    const participantMap = new Map<string, DetectedPerson>();
    for (const p of photos) {
      for (const person of p.detectedPeople) {
        participantMap.set(person.personId, person);
      }
    }
    const participants = Array.from(participantMap.values());

    // 4. Aggregate unique activity tags and dominant POI
    const activitySet = new Set<string>();
    for (const p of photos) {
      for (const tag of p.activityTags) activitySet.add(tag);
      for (const tag of p.sceneTags) activitySet.add(tag);
    }
    const activityTags = Array.from(activitySet);

    // Dominant POI & Location
    const dominantLocation = bestPhoto.location;
    const timeOfDay = bestPhoto.timeOfDayBucket;

    // 5. Synthesize Title & Summary
    const title = this.generateTitle(dominantLocation, timeOfDay, participants);
    const summary = `Captured ${photos.length} photos during ${timeOfDay} at ${dominantLocation.poiName || dominantLocation.city}, featuring ${participants.map(p => p.displayName).join(', ') || 'personal moments'}.`;

    // 6. Compute Cluster Coherence
    let totalSim = 0;
    for (const p of photos) {
      totalSim += cosineSimilarity(p.visualEmbedding, centroidEmbedding);
    }
    const coherenceScore = Number((totalSim / photos.length).toFixed(3));

    return {
      id: `ep_${cluster.clusterId}_${dominantLocation.city.toLowerCase()}`,
      title,
      summary,
      tripId,
      startTime: cluster.startTime,
      endTime: cluster.endTime,
      timeOfDayBucket: timeOfDay,
      location: dominantLocation,
      participants,
      activityTags,
      anchorPhotoId: bestPhoto.photoId,
      photoCount: photos.length,
      photoIds: photos.map(p => p.photoId),
      centroidEmbedding,
      coherenceScore
    };
  }

  /**
   * Groups trip episodes into a TripContainer
   */
  public synthesizeTrip(
    tripId: string, 
    episodes: MemoryEpisode[], 
    destinationCity: string = 'Goa'
  ): TripContainer {
    const sorted = [...episodes].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const startDate = sorted[0].startTime.split('T')[0];
    const endDate = sorted[sorted.length - 1].endTime.split('T')[0];
    const totalPhotos = sorted.reduce((acc, ep) => acc + ep.photoCount, 0);

    return {
      id: tripId,
      title: `Trip to ${destinationCity}`,
      destination: sorted[0].location,
      startDate,
      endDate,
      episodeIds: sorted.map(e => e.id),
      totalPhotos,
      coverPhotoId: sorted[0].anchorPhotoId
    };
  }

  private generateTitle(
    loc: { poiName?: string; poiCategory?: string; city: string; neighborhood?: string },
    timeOfDay: string,
    participants: DetectedPerson[]
  ): string {
    const formattedTime = timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1);
    const groupName = participants.length > 0 
      ? (participants.some(p => p.relationshipGroup === 'friends') ? 'with Friends' : 'with Family')
      : '';

    if (loc.poiName) {
      return `${formattedTime} at ${loc.poiName} ${groupName}`.trim();
    }
    if (loc.poiCategory) {
      const cat = loc.poiCategory.charAt(0).toUpperCase() + loc.poiCategory.slice(1);
      return `${formattedTime} ${cat} in ${loc.city} ${groupName}`.trim();
    }
    return `${formattedTime} in ${loc.city} ${groupName}`.trim();
  }
}
