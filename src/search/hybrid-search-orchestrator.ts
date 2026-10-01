import { 
  TimelineAnchorResponse, 
  PrimaryAnchor, 
  AlternativeAnchor, 
  ContextWindow,
  SurroundingEpisodeSummary
} from '../types/timeline.js';
import { GroqIntentParser, ParseResult } from '../intent/groq-intent-parser.js';
import { QueryEmbedder } from '../intent/query-embedder.js';
import { MemoryStore, ScoredEpisode } from '../db/memory-store.js';

export interface SearchExecutionMetrics {
  totalLatencyMs: number;
  intentParseLatencyMs: number;
  retrievalLatencyMs: number;
  modelUsed: string;
  isMockFallback?: boolean;
}

export interface HybridSearchResult {
  response: TimelineAnchorResponse;
  metrics: SearchExecutionMetrics;
  candidateScores: ScoredEpisode[];
}

export class HybridSearchOrchestrator {
  private intentParser: GroqIntentParser;
  private embedder: QueryEmbedder;
  private store: MemoryStore;

  constructor(store: MemoryStore, intentParser?: GroqIntentParser, embedder?: QueryEmbedder) {
    this.store = store;
    this.intentParser = intentParser || new GroqIntentParser();
    this.embedder = embedder || new QueryEmbedder();
  }

  /**
   * Complete End-to-End Pipeline:
   * Query -> Groq Intent Extraction -> Query Embedding -> Hybrid Candidate Retrieval -> Anchor Resolution -> Context Window
   */
  public async searchAndResolveAnchor(rawQuery: string): Promise<HybridSearchResult> {
    const totalStart = performance.now();

    // 1. Natural language slot extraction via Groq LPU API
    const parseResult: ParseResult = await this.intentParser.parseIntent(rawQuery);
    const intent = parseResult.intent;

    // 2. Multi-modal query vector embedding
    const queryEmbedding = this.embedder.embedQuery(intent);

    // 3. Hybrid Vector + Metadata Filter Scoring
    const retrievalStart = performance.now();
    const rankedEpisodes = this.store.searchEpisodes(queryEmbedding, intent);
    const retrievalLatencyMs = Number((performance.now() - retrievalStart).toFixed(1));

    if (rankedEpisodes.length === 0) {
      throw new Error(`No episodes found in memory store matching query: "${rawQuery}"`);
    }

    // 4. Primary Anchor Resolution
    const topScored = rankedEpisodes[0];
    const primaryEp = topScored.episode;

    const heroPhoto = this.store.getMediaAsset(primaryEp.anchorPhotoId) || {
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
    };

    const epStartDate = new Date(primaryEp.startTime);
    const primaryAnchor: PrimaryAnchor = {
      episodeId: primaryEp.id,
      confidenceScore: Number(topScored.totalScore.toFixed(3)),
      timestamp: primaryEp.startTime,
      anchorPhoto: heroPhoto,
      timelinePosition: {
        year: epStartDate.getUTCFullYear(),
        month: epStartDate.getUTCMonth() + 1,
        day: epStartDate.getUTCDate(),
        normalizedPosition: 0.785
      }
    };

    // 5. Context Window Building (Micro, Meso, Macro)
    const episodePhotos = this.store.getPhotosForEpisode(primaryEp.id);
    const surrounding = this.store.getSurroundingEpisodes(primaryEp.id, 2);

    const surroundingSummaries: SurroundingEpisodeSummary[] = [
      ...surrounding.before.map(ep => ({
        episodeId: ep.id,
        title: ep.title,
        timeRange: `${ep.startTime.slice(11, 16)} - ${ep.endTime.slice(11, 16)}`,
        relativeLabel: 'earlier that day'
      })),
      ...surrounding.after.map(ep => ({
        episodeId: ep.id,
        title: ep.title,
        timeRange: `${ep.startTime.slice(11, 16)} - ${ep.endTime.slice(11, 16)}`,
        relativeLabel: 'later / next'
      }))
    ];

    const parentTrip = primaryEp.tripId ? this.store.getTrip(primaryEp.tripId) : undefined;

    const contextWindow: ContextWindow = {
      parentTrip,
      episodePhotos,
      surroundingEpisodes: surroundingSummaries
    };

    // 6. Alternative Anchors Selection
    const alternativeAnchors: AlternativeAnchor[] = rankedEpisodes
      .slice(1, 4)
      .filter(item => item.totalScore >= 0.5)
      .map(item => ({
        episodeId: item.episode.id,
        confidenceScore: Number(item.totalScore.toFixed(3)),
        title: item.episode.title,
        date: item.episode.startTime.split('T')[0],
        reason: `Matched ${item.components.geoMatchScore > 0.5 ? 'location' : ''} ${item.components.timeMatchScore > 0.5 ? 'time' : ''}`.trim()
      }));

    const totalLatencyMs = Number((performance.now() - totalStart).toFixed(1));

    const response: TimelineAnchorResponse = {
      queryId: `q_${Date.now()}`,
      parsedIntent: intent,
      primaryAnchor,
      contextWindow,
      alternativeAnchors
    };

    const metrics: SearchExecutionMetrics = {
      totalLatencyMs,
      intentParseLatencyMs: parseResult.latencyMs,
      retrievalLatencyMs,
      modelUsed: parseResult.modelUsed,
      isMockFallback: parseResult.isMockFallback
    };

    return { response, metrics, candidateScores: rankedEpisodes };
  }
}
