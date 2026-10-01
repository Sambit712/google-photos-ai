import * as fs from 'fs';
import * as path from 'path';
import { 
  MediaAssetContext, 
  MemoryEpisode, 
  TripContainer, 
  DetectedPerson 
} from '../types/index.js';

// Deterministic Pseudo-Random Generator (seeded) for reproducible embeddings & timestamps
class SeededRandom {
  private seed: number;
  constructor(seed: number = 42) {
    this.seed = seed;
  }
  public next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

const rng = new SeededRandom(1337);

function generateNormalizedEmbedding(conceptBias: number[] = []): number[] {
  const dim = 768;
  const vec = new Array(dim).fill(0);
  let norm = 0;

  for (let i = 0; i < dim; i++) {
    const val = (rng.next() * 2 - 1) + (conceptBias[i % conceptBias.length] || 0);
    vec[i] = val;
    norm += val * val;
  }

  const mag = Math.sqrt(norm);
  return vec.map(v => Number((v / mag).toFixed(6)));
}

// Concept biases for distinct semantic scenes
const CAFE_EVENING_BIAS = [0.8, -0.2, 0.6, 0.4, -0.5, 0.9, 0.3, 0.7];
const BEACH_SUNSET_BIAS = [-0.3, 0.9, 0.4, 0.8, 0.2, -0.4, 0.8, -0.2];
const HERITAGE_WALK_BIAS = [0.1, -0.7, 0.8, -0.4, 0.6, 0.2, -0.1, 0.5];
const HOME_DAILY_BIAS = [-0.6, -0.5, -0.2, 0.1, -0.8, -0.1, 0.2, -0.7];

export interface FixtureData {
  trips: TripContainer[];
  episodes: MemoryEpisode[];
  photos: MediaAssetContext[];
}

export function generateGoaTripFixture(): FixtureData {
  const friends: DetectedPerson[] = [
    { personId: 'p_rohan', displayName: 'Rohan Sharma', relationshipGroup: 'friends', confidence: 0.98 },
    { personId: 'p_ananya', displayName: 'Ananya Roy', relationshipGroup: 'friends', confidence: 0.96 },
    { personId: 'p_vikram', displayName: 'Vikram Mehta', relationshipGroup: 'friends', confidence: 0.95 }
  ];

  const family: DetectedPerson[] = [
    { personId: 'p_mom', displayName: 'Mom', relationshipGroup: 'family', confidence: 0.99 }
  ];

  const trips: TripContainer[] = [
    {
      id: 'trip_goa_2023',
      title: 'Trip to Goa with Friends',
      destination: {
        country: 'India',
        state: 'Goa',
        city: 'Anjuna',
        coordinates: { latitude: 15.5828, longitude: 73.7431 }
      },
      startDate: '2023-11-16',
      endDate: '2023-11-20',
      episodeIds: [
        'ep_goa_checkin',
        'ep_baga_sunset',
        'ep_anjuna_flea_market',
        'ep_anjuna_cafe_evening',
        'ep_curlies_night',
        'ep_old_goa_heritage',
        'ep_panaji_brunch'
      ],
      totalPhotos: 420,
      coverPhotoId: 'photo_goa_cafe_hero'
    }
  ];

  const episodes: MemoryEpisode[] = [
    {
      id: 'ep_goa_checkin',
      tripId: 'trip_goa_2023',
      title: 'Arrival & Villa Check-in in Panaji',
      summary: 'Arriving in Goa, checking into the villa, luggage and pool lounge.',
      startTime: '2023-11-16T08:30:00Z', // 14:00 Local
      endTime: '2023-11-16T11:00:00Z',   // 16:30 Local
      timeOfDayBucket: 'afternoon',
      location: {
        country: 'India',
        state: 'Goa',
        city: 'Panaji',
        poiName: 'Heritage Villa Stay',
        poiCategory: 'hotel',
        coordinates: { latitude: 15.4989, longitude: 73.8278 }
      },
      participants: friends,
      activityTags: ['travel', 'hotel', 'swimming pool', 'arrival'],
      anchorPhotoId: 'photo_ep1_anchor',
      photoCount: 40,
      photoIds: [],
      centroidEmbedding: generateNormalizedEmbedding(HOME_DAILY_BIAS),
      coherenceScore: 0.92
    },
    {
      id: 'ep_baga_sunset',
      tripId: 'trip_goa_2023',
      title: 'Golden Hour & Sunset at Baga Beach',
      summary: 'Watching the sunset on Baga beach with waves, drinks, and beach shacks.',
      startTime: '2023-11-16T11:45:00Z', // 17:15 Local
      endTime: '2023-11-16T13:30:00Z',   // 19:00 Local
      timeOfDayBucket: 'golden_hour',
      location: {
        country: 'India',
        state: 'Goa',
        city: 'Baga',
        poiName: 'Baga Beach Boardwalk',
        poiCategory: 'beach',
        coordinates: { latitude: 15.5553, longitude: 73.7517 }
      },
      participants: friends,
      activityTags: ['beach', 'sunset', 'waves', 'relaxing'],
      anchorPhotoId: 'photo_ep2_anchor',
      photoCount: 65,
      photoIds: [],
      centroidEmbedding: generateNormalizedEmbedding(BEACH_SUNSET_BIAS),
      coherenceScore: 0.95
    },
    {
      id: 'ep_anjuna_flea_market',
      tripId: 'trip_goa_2023',
      title: 'Anjuna Beach Afternoon & Market Stroll',
      summary: 'Walking through handicrafts and beach stalls on Anjuna beach before sunset.',
      startTime: '2023-11-17T09:30:00Z', // 15:00 Local
      endTime: '2023-11-17T12:15:00Z',   // 17:45 Local
      timeOfDayBucket: 'afternoon',
      location: {
        country: 'India',
        state: 'Goa',
        city: 'Anjuna',
        poiName: 'Anjuna Beach Market',
        poiCategory: 'market',
        coordinates: { latitude: 15.5800, longitude: 73.7420 }
      },
      participants: friends,
      activityTags: ['shopping', 'market', 'walking', 'beach'],
      anchorPhotoId: 'photo_ep3_anchor',
      photoCount: 55,
      photoIds: [],
      centroidEmbedding: generateNormalizedEmbedding(BEACH_SUNSET_BIAS),
      coherenceScore: 0.91
    },
    // The Target Episode matching the user query:
    // "those photos from Goa when we went to a café with friends in the evening"
    {
      id: 'ep_anjuna_cafe_evening',
      tripId: 'trip_goa_2023',
      title: 'Evening Café & Dinner with Friends in Anjuna',
      summary: 'Relaxing at a beachfront café in Goa with friends, having coffee and dinner in the evening breeze.',
      startTime: '2023-11-17T13:00:00Z', // 18:30 Local
      endTime: '2023-11-17T16:15:00Z',   // 21:45 Local
      timeOfDayBucket: 'evening',
      location: {
        country: 'India',
        state: 'Goa',
        city: 'Anjuna',
        neighborhood: 'North Anjuna Beach',
        poiName: 'Café Lilliput Beachside',
        poiCategory: 'cafe',
        coordinates: { latitude: 15.5828, longitude: 73.7431 }
      },
      participants: friends,
      activityTags: ['dining', 'cafe', 'coffee', 'cocktails', 'friends meetup', 'dinner'],
      anchorPhotoId: 'photo_goa_cafe_hero',
      photoCount: 85,
      photoIds: [],
      centroidEmbedding: generateNormalizedEmbedding(CAFE_EVENING_BIAS),
      coherenceScore: 0.98
    },
    {
      id: 'ep_curlies_night',
      tripId: 'trip_goa_2023',
      title: 'Late Night Party at Curlies',
      summary: 'Live music, neon lights, and dancing late at night in South Anjuna.',
      startTime: '2023-11-17T17:00:00Z', // 22:30 Local
      endTime: '2023-11-17T20:30:00Z',   // 02:00 Local (next day)
      timeOfDayBucket: 'night',
      location: {
        country: 'India',
        state: 'Goa',
        city: 'Anjuna',
        poiName: 'Curlies Shack & Club',
        poiCategory: 'club',
        coordinates: { latitude: 15.5728, longitude: 73.7445 }
      },
      participants: friends,
      activityTags: ['party', 'music', 'dancing', 'nightlife'],
      anchorPhotoId: 'photo_ep5_anchor',
      photoCount: 70,
      photoIds: [],
      centroidEmbedding: generateNormalizedEmbedding(CAFE_EVENING_BIAS),
      coherenceScore: 0.89
    },
    {
      id: 'ep_old_goa_heritage',
      tripId: 'trip_goa_2023',
      title: 'Old Goa Churches & Basilica Walk',
      summary: 'Exploring Basilica of Bom Jesus and heritage architecture under morning sunshine.',
      startTime: '2023-11-18T04:00:00Z', // 09:30 Local
      endTime: '2023-11-18T06:30:00Z',   // 12:00 Local
      timeOfDayBucket: 'morning',
      location: {
        country: 'India',
        state: 'Goa',
        city: 'Old Goa',
        poiName: 'Basilica of Bom Jesus',
        poiCategory: 'monument',
        coordinates: { latitude: 15.5009, longitude: 73.9116 }
      },
      participants: friends,
      activityTags: ['sightseeing', 'history', 'church', 'architecture'],
      anchorPhotoId: 'photo_ep6_anchor',
      photoCount: 50,
      photoIds: [],
      centroidEmbedding: generateNormalizedEmbedding(HERITAGE_WALK_BIAS),
      coherenceScore: 0.94
    },
    {
      id: 'ep_panaji_brunch',
      tripId: 'trip_goa_2023',
      title: 'Latin Quarter Brunch in Fontainhas',
      summary: 'Sunday morning brunch with coffee, pastries, and colorful colonial streets.',
      startTime: '2023-11-19T05:00:00Z', // 10:30 Local
      endTime: '2023-11-19T08:00:00Z',   // 13:30 Local
      timeOfDayBucket: 'morning',
      location: {
        country: 'India',
        state: 'Goa',
        city: 'Panaji',
        neighborhood: 'Fontainhas',
        poiName: 'Café Bodega Heritage Court',
        poiCategory: 'cafe',
        coordinates: { latitude: 15.4950, longitude: 73.8320 }
      },
      participants: friends,
      activityTags: ['brunch', 'cafe', 'pastries', 'coffee', 'walking'],
      anchorPhotoId: 'photo_ep7_anchor',
      photoCount: 55,
      photoIds: [],
      centroidEmbedding: generateNormalizedEmbedding(CAFE_EVENING_BIAS),
      coherenceScore: 0.93
    },
    // Home Episode (Non-trip baseline)
    {
      id: 'ep_home_bangalore_coffee',
      title: 'Weekend Morning Coffee at Home',
      summary: 'Quiet weekend morning brewing filter coffee at home in Bangalore.',
      startTime: '2023-10-15T03:00:00Z', // 08:30 Local
      endTime: '2023-10-15T04:30:00Z',   // 10:00 Local
      timeOfDayBucket: 'morning',
      location: {
        country: 'India',
        state: 'Karnataka',
        city: 'Bangalore',
        neighborhood: 'Indiranagar',
        poiName: 'Apartment',
        poiCategory: 'residence',
        coordinates: { latitude: 12.9716, longitude: 77.5946 }
      },
      participants: family,
      activityTags: ['coffee', 'home', 'breakfast'],
      anchorPhotoId: 'photo_home_anchor',
      photoCount: 80,
      photoIds: [],
      centroidEmbedding: generateNormalizedEmbedding(HOME_DAILY_BIAS),
      coherenceScore: 0.88
    }
  ];

  const photos: MediaAssetContext[] = [];

  // Generate constituent photos for each episode
  for (const episode of episodes) {
    const isTargetCafe = episode.id === 'ep_anjuna_cafe_evening';
    const bias = isTargetCafe 
      ? CAFE_EVENING_BIAS 
      : episode.location.poiCategory === 'beach' 
        ? BEACH_SUNSET_BIAS 
        : episode.location.poiCategory === 'monument'
          ? HERITAGE_WALK_BIAS
          : HOME_DAILY_BIAS;

    const startMs = new Date(episode.startTime).getTime();
    const endMs = new Date(episode.endTime).getTime();
    const interval = (endMs - startMs) / episode.photoCount;

    for (let i = 0; i < episode.photoCount; i++) {
      const photoTime = new Date(startMs + i * interval).toISOString();
      const photoId = (i === 0 && isTargetCafe) 
        ? 'photo_goa_cafe_hero' 
        : `photo_${episode.id}_${i + 1}`;

      episode.photoIds.push(photoId);

      const isKeyframe = (i === 0 || i === Math.floor(episode.photoCount / 2));
      const caption = isTargetCafe
        ? (i === 0 
            ? 'Friends laughing together around wooden table at beachfront café at dusk' 
            : `Evening tea and snacks at Anjuna seaside café, frame #${i + 1}`)
        : `${episode.title} - shot #${i + 1}`;

      photos.push({
        photoId,
        url: `https://photos.google.com/media/${photoId}.jpg`,
        thumbnailUrl: `https://photos.google.com/thumb/${photoId}.jpg`,
        timestamp: photoTime,
        timeOfDayBucket: episode.timeOfDayBucket,
        location: episode.location,
        detectedPeople: episode.participants,
        sceneTags: isTargetCafe ? ['cafe', 'restaurant', 'outdoor patio', 'evening lights', 'beachfront'] : episode.activityTags,
        activityTags: episode.activityTags,
        caption,
        visualEmbedding: generateNormalizedEmbedding(bias),
        aestheticScore: isKeyframe ? 0.94 : 0.78,
        isKeyframeCandidate: isKeyframe
      });
    }
  }

  return { trips, episodes, photos };
}

// Generate and write file if run directly via tsx
const fixtureData = generateGoaTripFixture();
const targetPath = path.join(process.cwd(), 'src', 'fixtures', 'goa-trip-fixture.json');
fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, JSON.stringify(fixtureData, null, 2), 'utf-8');
console.log(`Generated ${fixtureData.photos.length} synthetic photos across ${fixtureData.episodes.length} episodes into: ${targetPath}`);
