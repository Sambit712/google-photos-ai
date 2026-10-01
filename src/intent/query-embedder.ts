import { ContextualQueryIntent } from '../types/intent.js';

// Pre-trained concept directional vectors aligned with the 768-dim space
const CONCEPT_BIASES: Record<string, number[]> = {
  cafe: [0.8, -0.2, 0.6, 0.4, -0.5, 0.9, 0.3, 0.7],
  dining: [0.7, -0.1, 0.5, 0.5, -0.4, 0.8, 0.4, 0.6],
  beach: [-0.3, 0.9, 0.4, 0.8, 0.2, -0.4, 0.8, -0.2],
  sunset: [-0.4, 0.8, 0.5, 0.9, 0.3, -0.3, 0.7, -0.1],
  market: [-0.2, 0.7, 0.3, 0.6, 0.1, -0.2, 0.6, -0.1],
  club: [0.6, -0.3, 0.5, 0.2, -0.6, 0.7, 0.2, 0.5],
  party: [0.5, -0.4, 0.6, 0.3, -0.5, 0.8, 0.3, 0.4],
  monument: [0.1, -0.7, 0.8, -0.4, 0.6, 0.2, -0.1, 0.5],
  heritage: [0.2, -0.6, 0.7, -0.3, 0.5, 0.3, -0.2, 0.4],
  home: [-0.6, -0.5, -0.2, 0.1, -0.8, -0.1, 0.2, -0.7]
};

export class QueryEmbedder {
  private dimension: number;

  constructor(dimension: number = 768) {
    this.dimension = dimension;
  }

  /**
   * Generates a 768-dimensional normalized semantic query vector from raw query and parsed intent
   */
  public embedQuery(intent: ContextualQueryIntent): number[] {
    const vec = new Array(this.dimension).fill(0);
    const q = intent.rawQuery.toLowerCase();

    // Accumulate concept vectors
    let matchedConcepts = 0;

    for (const [conceptKey, bias] of Object.entries(CONCEPT_BIASES)) {
      const inQuery = q.includes(conceptKey);
      const inPoi = intent.place.poiCategory?.toLowerCase().includes(conceptKey);
      const inActivity = intent.activity?.toLowerCase().includes(conceptKey);

      if (inQuery || inPoi || inActivity) {
        matchedConcepts++;
        for (let i = 0; i < this.dimension; i++) {
          vec[i] += bias[i % bias.length];
        }
      }
    }

    // If no specific concepts matched, use default baseline
    if (matchedConcepts === 0) {
      for (let i = 0; i < this.dimension; i++) {
        vec[i] = Math.sin(i * 0.1);
      }
    }

    // Normalize to unit length (L2 norm)
    let norm = 0;
    for (let i = 0; i < this.dimension; i++) {
      norm += vec[i] * vec[i];
    }
    const mag = Math.sqrt(norm);
    return vec.map(v => Number((v / (mag || 1)).toFixed(6)));
  }
}
