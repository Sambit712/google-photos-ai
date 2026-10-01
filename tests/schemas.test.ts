import { describe, it, expect } from 'vitest';
import { 
  MemoryEpisodeSchema, 
  MediaAssetContextSchema, 
  ContextualQueryIntentSchema, 
  TimelineAnchorResponseSchema 
} from '../src/types/index.js';

describe('Phase 0: Schema Validation & Serialization Tests', () => {
  it('should validate a complete MediaAssetContext', () => {
    const validPhoto = {
      photoId: 'photo_test_101',
      url: 'https://photos.google.com/media/photo_test_101.jpg',
      thumbnailUrl: 'https://photos.google.com/thumb/photo_test_101.jpg',
      timestamp: '2023-11-17T19:30:00Z',
      timeOfDayBucket: 'evening',
      location: {
        country: 'India',
        state: 'Goa',
        city: 'Anjuna',
        neighborhood: 'Beachside',
        poiName: 'Beach Café',
        poiCategory: 'cafe',
        coordinates: { latitude: 15.5828, longitude: 73.7431 }
      },
      detectedPeople: [
        { personId: 'p_1', displayName: 'Rohan', relationshipGroup: 'friends', confidence: 0.95 }
      ],
      sceneTags: ['cafe', 'dining', 'table'],
      activityTags: ['dinner', 'coffee'],
      caption: 'Evening coffee with friends in Goa',
      visualEmbedding: new Array(768).fill(0.01),
      aestheticScore: 0.92,
      isKeyframeCandidate: true
    };

    const parsed = MediaAssetContextSchema.safeParse(validPhoto);
    expect(parsed.success).toBe(true);
  });

  it('should reject invalid timeOfDayBucket in MediaAssetContext', () => {
    const invalidPhoto = {
      photoId: 'photo_invalid',
      url: 'https://photos.google.com/media/invalid.jpg',
      timestamp: '2023-11-17T19:30:00Z',
      timeOfDayBucket: 'super_late_night', // Invalid bucket
      location: {
        country: 'India',
        state: 'Goa',
        city: 'Anjuna',
        coordinates: { latitude: 15.58, longitude: 73.74 }
      },
      detectedPeople: [],
      sceneTags: [],
      activityTags: [],
      visualEmbedding: new Array(768).fill(0)
    };

    const parsed = MediaAssetContextSchema.safeParse(invalidPhoto);
    expect(parsed.success).toBe(false);
  });

  it('should validate a complete MemoryEpisode schema', () => {
    const validEpisode = {
      id: 'ep_goa_cafe_01',
      title: 'Evening Café with Friends in Anjuna',
      summary: 'Dinner and drinks at the beachside café.',
      tripId: 'trip_goa_2023',
      startTime: '2023-11-17T18:30:00Z',
      endTime: '2023-11-17T21:45:00Z',
      timeOfDayBucket: 'evening',
      location: {
        country: 'India',
        state: 'Goa',
        city: 'Anjuna',
        poiName: 'Café Lilliput',
        poiCategory: 'cafe',
        coordinates: { latitude: 15.5828, longitude: 73.7431 }
      },
      participants: [
        { personId: 'p_1', displayName: 'Rohan', relationshipGroup: 'friends', confidence: 0.98 }
      ],
      activityTags: ['dining', 'coffee', 'friends meetup'],
      anchorPhotoId: 'photo_hero_01',
      photoCount: 45,
      photoIds: ['photo_01', 'photo_02', 'photo_hero_01'],
      centroidEmbedding: new Array(768).fill(0.02),
      coherenceScore: 0.96
    };

    const parsed = MemoryEpisodeSchema.safeParse(validEpisode);
    expect(parsed.success).toBe(true);
  });

  it('should validate ContextualQueryIntent parsed slots', () => {
    const intent = {
      rawQuery: 'those photos from Goa when we went to a café with friends in the evening',
      place: {
        region: 'Goa',
        poiCategory: 'cafe'
      },
      activity: 'dining / cafe visit',
      peopleGroup: 'friends',
      temporal: {
        timeOfDay: 'evening'
      },
      extractedKeywords: ['Goa', 'café', 'friends', 'evening'],
      confidenceScore: 0.94
    };

    const parsed = ContextualQueryIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.place.region).toBe('Goa');
      expect(parsed.data.temporal.timeOfDay).toBe('evening');
      expect(parsed.data.peopleGroup).toBe('friends');
    }
  });

  it('should validate TimelineAnchorResponse', () => {
    const mockResponse = {
      queryId: 'query_123',
      parsedIntent: {
        rawQuery: 'photos from Goa café with friends in evening',
        place: { region: 'Goa', poiCategory: 'cafe' },
        activity: 'dining',
        peopleGroup: 'friends',
        temporal: { timeOfDay: 'evening' },
        extractedKeywords: ['Goa', 'café', 'friends'],
        confidenceScore: 0.95
      },
      primaryAnchor: {
        episodeId: 'ep_goa_cafe_01',
        confidenceScore: 0.96,
        timestamp: '2023-11-17T19:30:00Z',
        anchorPhoto: {
          photoId: 'photo_goa_cafe_hero',
          url: 'https://photos.google.com/media/photo_goa_cafe_hero.jpg',
          timestamp: '2023-11-17T19:30:00Z',
          timeOfDayBucket: 'evening',
          location: {
            country: 'India',
            state: 'Goa',
            city: 'Anjuna',
            coordinates: { latitude: 15.5828, longitude: 73.7431 }
          },
          detectedPeople: [],
          sceneTags: ['cafe'],
          activityTags: ['dining'],
          visualEmbedding: new Array(768).fill(0.01),
          aestheticScore: 0.95,
          isKeyframeCandidate: true
        },
        timelinePosition: {
          year: 2023,
          month: 11,
          day: 17,
          normalizedPosition: 0.78
        }
      },
      contextWindow: {
        episodePhotos: [],
        surroundingEpisodes: [
          {
            episodeId: 'ep_baga_sunset',
            title: 'Sunset at Baga Beach',
            timeRange: '17:15 - 19:00',
            relativeLabel: 'earlier that day'
          }
        ]
      },
      alternativeAnchors: []
    };

    const parsed = TimelineAnchorResponseSchema.safeParse(mockResponse);
    expect(parsed.success).toBe(true);
  });
});
