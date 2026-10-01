import { z } from 'zod';
import { ContextualQueryIntentSchema } from './intent.js';
import { MediaAssetContextSchema } from './media.js';
import { MemoryEpisodeSchema, TripContainerSchema } from './episode.js';

export const TimelinePositionSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  normalizedPosition: z.number().min(0).max(1) // 0 to 1 position along full library timeline
});
export type TimelinePosition = z.infer<typeof TimelinePositionSchema>;

export const PrimaryAnchorSchema = z.object({
  episodeId: z.string(),
  confidenceScore: z.number().min(0).max(1),
  timestamp: z.string().datetime(),
  anchorPhoto: MediaAssetContextSchema,
  timelinePosition: TimelinePositionSchema
});
export type PrimaryAnchor = z.infer<typeof PrimaryAnchorSchema>;

export const SurroundingEpisodeSummarySchema = z.object({
  episodeId: z.string(),
  title: z.string(),
  timeRange: z.string(),
  relativeLabel: z.string() // e.g. "earlier that afternoon", "next morning"
});
export type SurroundingEpisodeSummary = z.infer<typeof SurroundingEpisodeSummarySchema>;

export const ContextWindowSchema = z.object({
  parentTrip: TripContainerSchema.optional(),
  episodePhotos: z.array(MediaAssetContextSchema),
  surroundingEpisodes: z.array(SurroundingEpisodeSummarySchema)
});
export type ContextWindow = z.infer<typeof ContextWindowSchema>;

export const AlternativeAnchorSchema = z.object({
  episodeId: z.string(),
  confidenceScore: z.number().min(0).max(1),
  title: z.string(),
  date: z.string(),
  reason: z.string().optional()
});
export type AlternativeAnchor = z.infer<typeof AlternativeAnchorSchema>;

export const TimelineAnchorResponseSchema = z.object({
  queryId: z.string(),
  parsedIntent: ContextualQueryIntentSchema,
  primaryAnchor: PrimaryAnchorSchema,
  contextWindow: ContextWindowSchema,
  alternativeAnchors: z.array(AlternativeAnchorSchema).default([])
});
export type TimelineAnchorResponse = z.infer<typeof TimelineAnchorResponseSchema>;
