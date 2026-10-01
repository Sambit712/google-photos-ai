import Groq from 'groq-sdk';
import { 
  ContextualQueryIntent, 
  ContextualQueryIntentSchema 
} from '../types/intent.js';
import { TimeOfDayBucket } from '../types/media.js';
import * as dotenv from 'dotenv';

dotenv.config();

export interface GroqParserConfig {
  apiKey?: string;
  primaryModel?: string;
  fallbackModel?: string;
  temperature?: number;
}

export interface ParseResult {
  intent: ContextualQueryIntent;
  latencyMs: number;
  modelUsed: string;
  isMockFallback?: boolean;
}

export class GroqIntentParser {
  private groqClient: Groq | null = null;
  private primaryModel: string;
  private fallbackModel: string;
  private temperature: number;

  constructor(config: GroqParserConfig = {}) {
    const rawApiKey = config.apiKey || process.env.GROQ_API_KEY;
    const apiKey = rawApiKey ? rawApiKey.replace(/^\./, '').trim() : undefined;
    if (apiKey && apiKey !== 'gsk_your_groq_api_key_here') {
      this.groqClient = new Groq({ apiKey });
    }
    this.primaryModel = config.primaryModel || process.env.GROQ_PRIMARY_MODEL || 'openai/gpt-oss-120b';
    this.fallbackModel = config.fallbackModel || process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-20b';
    this.temperature = config.temperature ?? 0.1;
  }

  /**
   * Parses natural language query into structured episodic memory slots
   */
  public async parseIntent(userQuery: string): Promise<ParseResult> {
    const startTime = performance.now();

    // If Groq client is configured, call Groq LPU API
    if (this.groqClient) {
      try {
        const result = await this.callGroqAPI(userQuery, this.primaryModel);
        const latencyMs = Number((performance.now() - startTime).toFixed(1));
        return {
          intent: result,
          latencyMs,
          modelUsed: this.primaryModel,
          isMockFallback: false
        };
      } catch (err) {
        console.warn(`[GroqIntentParser] Primary model ${this.primaryModel} failed, trying fallback ${this.fallbackModel}:`, err);
        try {
          const result = await this.callGroqAPI(userQuery, this.fallbackModel);
          const latencyMs = Number((performance.now() - startTime).toFixed(1));
          return {
            intent: result,
            latencyMs,
            modelUsed: this.fallbackModel,
            isMockFallback: false
          };
        } catch (fallbackErr) {
          console.error('[GroqIntentParser] Groq API call failed completely, using local parser fallback:', fallbackErr);
        }
      }
    }

    // High-fidelity rule-based slot extractor (offline / mock fallback)
    const localIntent = this.parseLocally(userQuery);
    const latencyMs = Number((performance.now() - startTime).toFixed(1));
    return {
      intent: localIntent,
      latencyMs,
      modelUsed: 'local-rule-engine-fallback',
      isMockFallback: true
    };
  }

  private async callGroqAPI(query: string, model: string): Promise<ContextualQueryIntent> {
    if (!this.groqClient) throw new Error('Groq client not initialized');

    const completion = await this.groqClient.chat.completions.create({
      model,
      temperature: this.temperature,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an expert episodic memory intent parser for personal photo archives (Google Photos Semantic Discovery).
Analyze conversational queries about past experiences and extract multi-dimensional memory clues into structured JSON.

JSON Schema:
{
  "place": {
    "region": string or null (e.g. "Goa", "Karnataka"),
    "city": string or null (e.g. "Anjuna", "Panaji", "Bangalore"),
    "poiCategory": string or null (e.g. "cafe", "beach", "restaurant", "club", "monument", "hotel"),
    "specificVenue": string or null (e.g. "Cafe Lilliput")
  },
  "activity": string or null (e.g. "dining / cafe visit", "shopping", "party"),
  "peopleGroup": "friends" | "family" | "colleagues" | "solo" | null,
  "temporal": {
    "timeOfDay": "dawn" | "morning" | "afternoon" | "golden_hour" | "evening" | "night" | null,
    "relativeSeason": string or null,
    "yearHint": number or null,
    "approximateMonth": string or null
  },
  "extractedKeywords": string[],
  "confidenceScore": number (0.0 to 1.0)
}`
        },
        {
          role: 'user',
          content: query
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from Groq API');
    }

    const rawParsed = JSON.parse(content);
    rawParsed.rawQuery = query;

    const validated = ContextualQueryIntentSchema.parse(rawParsed);
    return validated;
  }

  /**
   * Deterministic local fallback parser for offline use and test suites
   */
  public parseLocally(query: string): ContextualQueryIntent {
    const q = query.toLowerCase();

    // 1. Place extraction
    let region: string | null = null;
    let city: string | null = null;
    let poiCategory: string | null = null;
    let specificVenue: string | null = null;

    if (q.includes('goa')) region = 'Goa';
    if (q.includes('bangalore') || q.includes('bengaluru') || q.includes('indiranagar')) {
      region = 'Karnataka';
      city = 'Bangalore';
    }
    if (q.includes('anjuna')) city = 'Anjuna';
    if (q.includes('panaji') || q.includes('fontainhas')) city = 'Panaji';
    if (q.includes('old goa')) city = 'Old Goa';
    if (q.includes('baga')) city = 'Baga';

    if (q.includes('lilliput')) {
      specificVenue = 'Café Lilliput';
      poiCategory = 'cafe';
      city = 'Anjuna';
    } else if (q.includes('curlies')) {
      specificVenue = 'Curlies Beach Shack';
      poiCategory = 'club';
      city = 'Anjuna';
    } else if (q.includes('bom jesus') || q.includes('basilica')) {
      specificVenue = 'Basilica of Bom Jesus';
      poiCategory = 'monument';
      city = 'Old Goa';
    } else if (q.includes('bodega')) {
      specificVenue = 'Café Bodega';
      poiCategory = 'cafe';
      city = 'Panaji';
    } else if (q.includes('villa') || q.includes('pool') || q.includes('resort')) {
      poiCategory = 'hotel';
      city = city || 'Panaji';
    } else if (q.includes('flea market') || q.includes('market') || q.includes('souvenir') || q.includes('stalls')) {
      poiCategory = 'market';
      city = city || 'Anjuna';
    } else if (q.includes('home') || q.includes('house') || q.includes('apartment') || q.includes('kitchen')) {
      poiCategory = 'residence';
      city = city || 'Bangalore';
    } else if (q.includes('café') || q.includes('cafe') || q.includes('coffee') || q.includes('brunch') || q.includes('pastries')) {
      poiCategory = 'cafe';
    } else if (q.includes('sunset') || q.includes('shack') || q.includes('beach') || q.includes('waves') || q.includes('sand') || q.includes('coast')) {
      poiCategory = 'beach';
    } else if (q.includes('club') || q.includes('party') || q.includes('rave') || q.includes('trance')) {
      poiCategory = 'club';
    } else if (q.includes('church') || q.includes('monument') || q.includes('cathedral') || q.includes('heritage')) {
      poiCategory = 'monument';
    }

    // 2. People extraction
    let peopleGroup: 'friends' | 'family' | 'colleagues' | 'solo' | null = null;
    if (q.includes('friend') || q.includes('friends') || q.includes('buddies') || q.includes('gang') ||
        q.includes('rohan') || q.includes('ananya') || q.includes('vikram')) {
      peopleGroup = 'friends';
    } else if (q.includes('family') || q.includes('parents') || q.includes('mom') || q.includes('dad')) {
      peopleGroup = 'family';
    } else if (q.includes('colleague') || q.includes('coworker') || q.includes('office')) {
      peopleGroup = 'colleagues';
    } else if (q.includes('alone') || q.includes('solo') || q.includes('myself')) {
      peopleGroup = 'solo';
    }

    // 3. Time extraction
    let timeOfDay: TimeOfDayBucket | null = null;
    if (q.includes('sunset') || q.includes('golden hour') || q.includes('sundown') || q.includes('golden')) {
      timeOfDay = 'golden_hour';
    } else if (q.includes('evening') || q.includes('dusk') || q.includes('dinner') || q.includes('tea')) {
      timeOfDay = 'evening';
    } else if (q.includes('night') || q.includes('late night') || q.includes('midnight') || q.includes('2 am')) {
      timeOfDay = 'night';
    } else if (q.includes('morning') || q.includes('breakfast') || q.includes('brunch') || q.includes('10 am') || q.includes('8:30 am')) {
      timeOfDay = 'morning';
    } else if (q.includes('afternoon') || q.includes('lunch') || q.includes('post lunch')) {
      timeOfDay = 'afternoon';
    } else if (q.includes('dawn') || q.includes('sunrise')) {
      timeOfDay = 'dawn';
    }

    // 4. Activity extraction
    let activity: string | null = null;
    if (q.includes('home') || q.includes('filter coffee') || q.includes('brewing') || (poiCategory === 'residence')) {
      activity = 'home coffee / relaxing';
    } else if (q.includes('market') || q.includes('shopping') || q.includes('souvenir') || q.includes('bargaining') || (poiCategory === 'market')) {
      activity = 'flea market shopping';
    } else if (q.includes('pool') || q.includes('swimming') || q.includes('villa') || q.includes('luggage') || q.includes('checkin') || (poiCategory === 'hotel')) {
      activity = 'hotel villa checkin & pool';
    } else if (q.includes('party') || q.includes('dancing') || q.includes('trance') || q.includes('rave') || q.includes('cocktails') || (poiCategory === 'club')) {
      activity = 'nightlife / clubbing';
    } else if (q.includes('church') || q.includes('monument') || q.includes('basilica') || q.includes('altar') || q.includes('architecture') || (poiCategory === 'monument')) {
      activity = 'heritage sightseeing';
    } else if (q.includes('brunch') || q.includes('pastries') || q.includes('fontainhas')) {
      activity = 'brunch';
    } else if (q.includes('sunset') || q.includes('waves') || (poiCategory === 'beach')) {
      activity = 'beach walk / sunset watching';
    } else if (q.includes('cafe') || q.includes('café') || q.includes('coffee') || q.includes('dinner') || q.includes('dining')) {
      activity = 'dining / cafe visit';
    }

    // 5. Keywords
    const extractedKeywords: string[] = [];
    if (region) extractedKeywords.push(region);
    if (city) extractedKeywords.push(city);
    if (poiCategory) extractedKeywords.push(poiCategory);
    if (specificVenue) extractedKeywords.push(specificVenue);
    if (peopleGroup) extractedKeywords.push(peopleGroup);
    if (timeOfDay) extractedKeywords.push(timeOfDay);
    if (activity) extractedKeywords.push(activity);

    return {
      rawQuery: query,
      place: {
        region,
        city,
        poiCategory,
        specificVenue
      },
      activity,
      peopleGroup,
      temporal: {
        timeOfDay,
        relativeSeason: q.includes('monsoon') ? 'monsoon' : null,
        yearHint: q.match(/20\d{2}/) ? parseInt(q.match(/20\d{2}/)![0], 10) : null
      },
      extractedKeywords,
      confidenceScore: 0.95
    };
  }
}
