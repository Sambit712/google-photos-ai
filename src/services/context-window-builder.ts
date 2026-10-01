import { 
  MemoryEpisode, 
  MediaAssetContext, 
  TripContainer, 
  ContextWindow, 
  PrimaryAnchor, 
  AlternativeAnchor, 
  TimelineAnchorResponse, 
  ContextualQueryIntent,
  SurroundingEpisodeSummary
} from '../types/index.js';
import { MemoryStore, ScoredEpisode } from '../db/memory-store.js';

export interface ContextWindowOptions {
  mesoWindowHours?: number;   // Hours before and after anchor episode to scan for siblings (default 12)
  maxPhotosPerEpisode?: number;
  maxAlternativeAnchors?: number;
}

export class ContextWindowBuilder {
  private store: MemoryStore;
  private options: Required<ContextWindowOptions>;

  constructor(store: MemoryStore, options: ContextWindowOptions = {}) {
    this.store = store;
    this.options = {
      mesoWindowHours: options.mesoWindowHours ?? 12,
      maxPhotosPerEpisode: options.maxPhotosPerEpisode ?? 100,
      maxAlternativeAnchors: options.maxAlternativeAnchors ?? 3
    };
  }

  /**
   * Constructs the full Context Envelope around a primary scored anchor episode
   */
  public buildContextEnvelope(
    queryId: string,
    intent: ContextualQueryIntent,
    rankedCandidates: ScoredEpisode[]
  ): TimelineAnchorResponse {
    if (rankedCandidates.length === 0) {
      throw new Error(`Cannot build context envelope for empty candidate list.`);
    }

    const topCandidate = rankedCandidates[0];
    const primaryEp = topCandidate.episode;

    // 1. Resolve Micro-Window (constituent photos + hero anchor photo)
    const allPhotos = this.store.getPhotosForEpisode(primaryEp.id);
    const episodePhotos = allPhotos.slice(0, this.options.maxPhotosPerEpisode);

    const heroPhoto = this.store.getMediaAsset(primaryEp.anchorPhotoId) || (episodePhotos.length > 0 ? episodePhotos[0] : {
      photoId: primaryEp.anchorPhotoId,
      url: `https://photos.google.com/media/${primaryEp.anchorPhotoId}.jpg`,
      timestamp: primaryEp.startTime,
      timeOfDayBucket: primaryEp.timeOfDayBucket,
      location: primaryEp.location,
      detectedPeople: primaryEp.participants,
      sceneTags: primaryEp.activityTags,
      activityTags: primaryEp.activityTags,
      visualEmbedding: primaryEp.centroidEmbedding,
      aestheticScore: 0.95,
      isKeyframeCandidate: true
    });

    // 2. Resolve Meso-Window (surrounding sibling episodes within ±12 hours)
    const mesoMs = this.options.mesoWindowHours * 60 * 60 * 1000;
    const epStartMs = new Date(primaryEp.startTime).getTime();
    const epEndMs = new Date(primaryEp.endTime).getTime();

    const allEpisodes = this.store.getAllEpisodes()
      .filter(e => e.id !== primaryEp.id)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const surroundingEpisodes: SurroundingEpisodeSummary[] = [];

    for (const ep of allEpisodes) {
      const startMs = new Date(ep.startTime).getTime();
      const endMs = new Date(ep.endTime).getTime();

      // Within ±mesoWindowHours
      if (endMs <= epStartMs && (epStartMs - endMs) <= mesoMs) {
        surroundingEpisodes.push({
          episodeId: ep.id,
          title: ep.title,
          timeRange: `${ep.startTime.slice(11, 16)} - ${ep.endTime.slice(11, 16)}`,
          relativeLabel: this.getRelativeLabel(endMs, epStartMs, 'before')
        });
      } else if (startMs >= epEndMs && (startMs - epEndMs) <= mesoMs) {
        surroundingEpisodes.push({
          episodeId: ep.id,
          title: ep.title,
          timeRange: `${ep.startTime.slice(11, 16)} - ${ep.endTime.slice(11, 16)}`,
          relativeLabel: this.getRelativeLabel(startMs, epEndMs, 'after')
        });
      }
    }

    // 3. Resolve Macro-Window (parent trip container)
    let parentTrip: TripContainer | undefined;
    if (primaryEp.tripId) {
      parentTrip = this.store.getTrip(primaryEp.tripId);
    }

    const contextWindow: ContextWindow = {
      parentTrip,
      episodePhotos,
      surroundingEpisodes
    };

    // 4. Primary Anchor Coordinates
    const anchorDate = new Date(primaryEp.startTime);
    const primaryAnchor: PrimaryAnchor = {
      episodeId: primaryEp.id,
      confidenceScore: Number(topCandidate.totalScore.toFixed(3)),
      timestamp: primaryEp.startTime,
      anchorPhoto: heroPhoto,
      timelinePosition: {
        year: anchorDate.getUTCFullYear(),
        month: anchorDate.getUTCMonth() + 1,
        day: anchorDate.getUTCDate(),
        normalizedPosition: this.calculateNormalizedTimelinePosition(anchorDate)
      }
    };

    // 5. Alternative Anchors
    const alternativeAnchors: AlternativeAnchor[] = rankedCandidates
      .slice(1, 1 + this.options.maxAlternativeAnchors)
      .filter(item => item.totalScore >= 0.45)
      .map(item => ({
        episodeId: item.episode.id,
        confidenceScore: Number(item.totalScore.toFixed(3)),
        title: item.episode.title,
        date: item.episode.startTime.split('T')[0],
        reason: `Matched ${item.components.geoMatchScore > 0.5 ? 'location' : ''} ${item.components.timeMatchScore > 0.5 ? 'time-of-day' : ''}`.trim()
      }));

    return {
      queryId,
      parsedIntent: intent,
      primaryAnchor,
      contextWindow,
      alternativeAnchors
    };
  }

  private calculateNormalizedTimelinePosition(date: Date): number {
    // Relative position across library timeline (e.g. 2020 - 2024 range)
    const minTimestamp = new Date('2020-01-01T00:00:00Z').getTime();
    const maxTimestamp = new Date('2024-12-31T23:59:59Z').getTime();
    const current = date.getTime();
    const clamped = Math.max(minTimestamp, Math.min(maxTimestamp, current));
    return Number(((clamped - minTimestamp) / (maxTimestamp - minTimestamp)).toFixed(4));
  }

  private getRelativeLabel(timeA: number, timeB: number, dir: 'before' | 'after'): string {
    const diffHours = Math.abs(timeA - timeB) / (1000 * 60 * 60);
    if (dir === 'before') {
      if (diffHours < 3) return 'just earlier';
      if (diffHours < 7) return 'earlier that afternoon';
      return 'earlier that morning';
    } else {
      if (diffHours < 3) return 'shortly after';
      if (diffHours < 7) return 'later that night';
      return 'next morning';
    }
  }
}
