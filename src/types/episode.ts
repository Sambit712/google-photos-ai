import { z } from 'zod';
import { TimeOfDayBucketSchema, LocationContextSchema, DetectedPersonSchema } from './media.js';

export const MemoryEpisodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  tripId: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timeOfDayBucket: TimeOfDayBucketSchema,
  location: LocationContextSchema,
  participants: z.array(DetectedPersonSchema),
  activityTags: z.array(z.string()),
  anchorPhotoId: z.string(),
  photoCount: z.number().int().positive(),
  photoIds: z.array(z.string()),
  centroidEmbedding: z.array(z.number()), // 768-dim multi-modal vector
  coherenceScore: z.number().min(0).max(1).default(1.0)
});
export type MemoryEpisode = z.infer<typeof MemoryEpisodeSchema>;

export const TripContainerSchema = z.object({
  id: z.string(),
  title: z.string(),
  destination: LocationContextSchema,
  startDate: z.string(), // YYYY-MM-DD
  endDate: z.string(),   // YYYY-MM-DD
  episodeIds: z.array(z.string()),
  totalPhotos: z.number().int().nonnegative(),
  coverPhotoId: z.string()
});
export type TripContainer = z.infer<typeof TripContainerSchema>;
