import { z } from 'zod';
import { TimeOfDayBucketSchema } from './media.js';

export const PlaceClueSchema = z.object({
  region: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  poiCategory: z.string().nullable().optional(), // e.g. "cafe", "beach", "restaurant"
  specificVenue: z.string().nullable().optional()
});
export type PlaceClue = z.infer<typeof PlaceClueSchema>;

export const TemporalClueSchema = z.object({
  timeOfDay: TimeOfDayBucketSchema.nullable().optional(),
  relativeSeason: z.string().nullable().optional(), // e.g. "monsoon", "winter"
  yearHint: z.number().int().nullable().optional(),
  approximateMonth: z.string().nullable().optional(),
  approximateDateRange: z.object({
    start: z.string().optional(),
    end: z.string().optional()
  }).optional()
});
export type TemporalClue = z.infer<typeof TemporalClueSchema>;

export const ContextualQueryIntentSchema = z.object({
  rawQuery: z.string(),
  place: PlaceClueSchema,
  activity: z.string().nullable().optional(),
  peopleGroup: z.enum(['friends', 'family', 'colleagues', 'solo', 'other']).nullable().optional(),
  temporal: TemporalClueSchema,
  extractedKeywords: z.array(z.string()).default([]),
  confidenceScore: z.number().min(0).max(1).default(1.0)
});
export type ContextualQueryIntent = z.infer<typeof ContextualQueryIntentSchema>;
