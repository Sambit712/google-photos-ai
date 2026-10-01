import { z } from 'zod';

export const TimeOfDayBucketSchema = z.enum([
  'dawn',
  'morning',
  'afternoon',
  'golden_hour',
  'evening',
  'night'
]);
export type TimeOfDayBucket = z.infer<typeof TimeOfDayBucketSchema>;

export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional()
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

export const LocationContextSchema = z.object({
  country: z.string(),
  state: z.string(),
  city: z.string(),
  neighborhood: z.string().optional(),
  poiName: z.string().optional(),
  poiCategory: z.string().optional(),
  coordinates: CoordinatesSchema
});
export type LocationContext = z.infer<typeof LocationContextSchema>;

export const DetectedPersonSchema = z.object({
  personId: z.string(),
  displayName: z.string(),
  relationshipGroup: z.enum(['friends', 'family', 'colleagues', 'solo', 'other']),
  confidence: z.number().min(0).max(1).default(1.0)
});
export type DetectedPerson = z.infer<typeof DetectedPersonSchema>;

export const MediaAssetContextSchema = z.object({
  photoId: z.string(),
  url: z.string().url().or(z.string()),
  thumbnailUrl: z.string().url().or(z.string()).optional(),
  timestamp: z.string().datetime(), // ISO 8601
  timeOfDayBucket: TimeOfDayBucketSchema,
  location: LocationContextSchema,
  detectedPeople: z.array(DetectedPersonSchema),
  sceneTags: z.array(z.string()),
  activityTags: z.array(z.string()),
  caption: z.string().optional(),
  visualEmbedding: z.array(z.number()), // 768-dim normalized vector
  aestheticScore: z.number().min(0).max(1).default(0.8),
  isKeyframeCandidate: z.boolean().default(false)
});
export type MediaAssetContext = z.infer<typeof MediaAssetContextSchema>;
