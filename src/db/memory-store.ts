import { 
  MemoryEpisode, 
  MediaAssetContext, 
  TripContainer, 
  ContextualQueryIntent 
} from '../types/index.js';

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

export interface ScoredEpisode {
  episode: MemoryEpisode;
  totalScore: number;
  components: {
    vectorSimilarity: number;
    geoMatchScore: number;
    peopleMatchScore: number;
    timeMatchScore: number;
    activityMatchScore: number;
  };
}

export class MemoryStore {
  private trips: Map<string, TripContainer> = new Map();
  private episodes: Map<string, MemoryEpisode> = new Map();
  private mediaAssets: Map<string, MediaAssetContext> = new Map();

  public addTrip(trip: TripContainer): void {
    this.trips.set(trip.id, trip);
  }

  public getTrip(tripId: string): TripContainer | undefined {
    return this.trips.get(tripId);
  }

  public getAllTrips(): TripContainer[] {
    return Array.from(this.trips.values());
  }

  public addEpisode(episode: MemoryEpisode): void {
    this.episodes.set(episode.id, episode);
  }

  public getEpisode(episodeId: string): MemoryEpisode | undefined {
    return this.episodes.get(episodeId);
  }

  public getAllEpisodes(): MemoryEpisode[] {
    return Array.from(this.episodes.values());
  }

  public addMediaAsset(media: MediaAssetContext): void {
    this.mediaAssets.set(media.photoId, media);
  }

  public getMediaAsset(photoId: string): MediaAssetContext | undefined {
    return this.mediaAssets.get(photoId);
  }

  public getAllMediaAssets(): MediaAssetContext[] {
    return Array.from(this.mediaAssets.values());
  }

  public getPhotosForEpisode(episodeId: string): MediaAssetContext[] {
    const episode = this.episodes.get(episodeId);
    if (!episode) return [];
    return episode.photoIds
      .map(id => this.mediaAssets.get(id))
      .filter((photo): photo is MediaAssetContext => photo !== undefined)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public getSurroundingEpisodes(targetEpisodeId: string, limit: number = 2): {
    before: MemoryEpisode[];
    after: MemoryEpisode[];
  } {
    const target = this.episodes.get(targetEpisodeId);
    if (!target) return { before: [], after: [] };

    const targetStart = new Date(target.startTime).getTime();
    const all = Array.from(this.episodes.values())
      .filter(ep => ep.id !== targetEpisodeId)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const before = all
      .filter(ep => new Date(ep.endTime).getTime() <= targetStart)
      .slice(-limit);

    const after = all
      .filter(ep => new Date(ep.startTime).getTime() >= new Date(target.endTime).getTime())
      .slice(0, limit);

    return { before, after };
  }

  /**
   * Hybrid scoring algorithm fusing vector similarity with structured slot matches
   */
  public searchEpisodes(
    queryEmbedding?: number[],
    intent?: ContextualQueryIntent,
    weights = {
      vector: 0.35,
      geo: 0.25,
      people: 0.20,
      time: 0.15,
      coherence: 0.05
    }
  ): ScoredEpisode[] {
    const scored: ScoredEpisode[] = [];

    for (const episode of this.episodes.values()) {
      // 1. Vector similarity
      let vectorSim = 0;
      if (queryEmbedding && episode.centroidEmbedding.length > 0) {
        vectorSim = Math.max(0, cosineSimilarity(queryEmbedding, episode.centroidEmbedding));
      }

      // 2. Geospatial match
      let geoMatch = 0;
      if (intent?.place) {
        const p = intent.place;
        const matchesRegion = p.region && (
          episode.location.state.toLowerCase().includes(p.region.toLowerCase()) ||
          episode.location.country.toLowerCase().includes(p.region.toLowerCase())
        );
        const matchesCity = p.city && (
          episode.location.city.toLowerCase().includes(p.city.toLowerCase()) ||
          episode.location.state.toLowerCase().includes(p.city.toLowerCase())
        );
        const cat = p.poiCategory ? p.poiCategory.toLowerCase() : '';
        const epCat = episode.location.poiCategory ? episode.location.poiCategory.toLowerCase() : '';
        const matchesCategory = cat && (
          epCat.includes(cat) ||
          cat.includes(epCat) ||
          episode.title.toLowerCase().includes(cat) ||
          ((cat === 'home' || cat === 'residence' || cat === 'house') && (epCat === 'residence' || epCat === 'home'))
        );

        if (matchesRegion && matchesCategory) geoMatch = 1.0;
        else if (matchesRegion || matchesCity) geoMatch = 0.7;
        else if (matchesCategory) geoMatch = 0.5;
      } else {
        geoMatch = 0.5;
      }

      // 3. People match
      let peopleMatch = 0;
      if (intent?.peopleGroup) {
        const hasMatchingGroup = episode.participants.some(
          person => person.relationshipGroup === intent.peopleGroup
        );
        peopleMatch = hasMatchingGroup ? 1.0 : 0.0;
      } else {
        peopleMatch = 0.5;
      }

      // 4. Time match
      let timeMatch = 0;
      if (intent?.temporal) {
        const t = intent.temporal;
        if (t.timeOfDay && episode.timeOfDayBucket === t.timeOfDay) {
          timeMatch = 1.0;
        } else if (t.timeOfDay) {
          timeMatch = 0.0;
        } else {
          timeMatch = 0.5;
        }
      } else {
        timeMatch = 0.5;
      }

      // 5. Activity match
      let activityMatch = 0;
      if (intent?.activity) {
        const act = intent.activity.toLowerCase();
        const hasTag = episode.activityTags.some(tag => 
          act.includes(tag.toLowerCase()) || tag.toLowerCase().includes(act)
        );
        activityMatch = hasTag ? 1.0 : 0.2;
      }

      const totalScore = 
        (weights.vector * vectorSim) +
        (weights.geo * geoMatch) +
        (weights.people * peopleMatch) +
        (weights.time * timeMatch) +
        (weights.coherence * (episode.coherenceScore || 1.0));

      scored.push({
        episode,
        totalScore,
        components: {
          vectorSimilarity: vectorSim,
          geoMatchScore: geoMatch,
          peopleMatchScore: peopleMatch,
          timeMatchScore: timeMatch,
          activityMatchScore: activityMatch
        }
      });
    }

    return scored.sort((a, b) => b.totalScore - a.totalScore);
  }

  public clear(): void {
    this.trips.clear();
    this.episodes.clear();
    this.mediaAssets.clear();
  }
}
