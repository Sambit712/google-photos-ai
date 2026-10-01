/**
 * Phased Rollout & Canary Deployment Engine
 *
 * Implements safe, progressive feature delivery:
 * 1. Internal Dogfooders (100% enabled for @google.com / dogfood tokens)
 * 2. Canary Cohort (5% deterministic allocation)
 * 3. Expanded Cohort (20% deterministic allocation)
 * 4. General Availability (100% rollout)
 */

import * as crypto from 'crypto';

export type RolloutStage = 'internal_dogfood' | 'canary_5pct' | 'expanded_20pct' | 'general_availability';

export interface RolloutConfig {
  currentStage: RolloutStage;
  dogfoodDomains: string[];
  dogfoodUserIds: string[];
  featureFlags: {
    enableSemanticTimeline: boolean;
    enableGroqLPUInference: boolean;
    enableMesoContextCarousel: boolean;
    enableClientPrefetching: boolean;
  };
}

export interface UserRolloutEvaluation {
  userId: string;
  isEligible: boolean;
  assignedStage: RolloutStage;
  bucketPercentile: number; // 0 to 99
  activeFeatureFlags: RolloutConfig['featureFlags'];
  reason: string;
}

export class RolloutManager {
  private config: RolloutConfig;

  constructor(initialStage: RolloutStage = 'canary_5pct') {
    this.config = {
      currentStage: initialStage,
      dogfoodDomains: ['google.com', 'alphabet.com'],
      dogfoodUserIds: ['user_demo_01', 'dogfood_tester_01', 'rohan_internal'],
      featureFlags: {
        enableSemanticTimeline: true,
        enableGroqLPUInference: true,
        enableMesoContextCarousel: true,
        enableClientPrefetching: true
      }
    };
  }

  /**
   * Deterministically hash user ID into a stable integer bucket [0..99]
   */
  public getUserBucket(userId: string): number {
    const hash = crypto.createHash('md5').update(`timeline_rollout:${userId}`).digest('hex');
    const intVal = parseInt(hash.substring(0, 8), 16);
    return intVal % 100;
  }

  /**
   * Evaluate user eligibility for the semantic memory timeline experience
   */
  public evaluateUser(userId: string, userEmail?: string): UserRolloutEvaluation {
    const bucket = this.getUserBucket(userId);

    // 1. Check Dogfood overrides
    if (this.config.dogfoodUserIds.includes(userId)) {
      return {
        userId,
        isEligible: true,
        assignedStage: 'internal_dogfood',
        bucketPercentile: bucket,
        activeFeatureFlags: this.config.featureFlags,
        reason: 'User explicitly whitelisted for internal dogfood access.'
      };
    }

    if (userEmail) {
      const domain = userEmail.split('@')[1]?.toLowerCase();
      if (domain && this.config.dogfoodDomains.includes(domain)) {
        return {
          userId,
          isEligible: true,
          assignedStage: 'internal_dogfood',
          bucketPercentile: bucket,
          activeFeatureFlags: this.config.featureFlags,
          reason: `Corporate internal email domain [${domain}] granted dogfood access.`
        };
      }
    }

    // 2. Stage-based evaluation
    switch (this.config.currentStage) {
      case 'internal_dogfood':
        return {
          userId,
          isEligible: false,
          assignedStage: this.config.currentStage,
          bucketPercentile: bucket,
          activeFeatureFlags: { ...this.config.featureFlags, enableSemanticTimeline: false },
          reason: 'Rollout restricted strictly to internal dogfooders.'
        };

      case 'canary_5pct':
        const isCanary = bucket < 5;
        return {
          userId,
          isEligible: isCanary,
          assignedStage: this.config.currentStage,
          bucketPercentile: bucket,
          activeFeatureFlags: {
            ...this.config.featureFlags,
            enableSemanticTimeline: isCanary
          },
          reason: isCanary
            ? `User bucket (${bucket}) falls within 5% canary cohort threshold.`
            : `User bucket (${bucket}) exceeds 5% canary cohort threshold.`
        };

      case 'expanded_20pct':
        const is20Pct = bucket < 20;
        return {
          userId,
          isEligible: is20Pct,
          assignedStage: this.config.currentStage,
          bucketPercentile: bucket,
          activeFeatureFlags: {
            ...this.config.featureFlags,
            enableSemanticTimeline: is20Pct
          },
          reason: is20Pct
            ? `User bucket (${bucket}) falls within 20% expanded cohort threshold.`
            : `User bucket (${bucket}) exceeds 20% expanded cohort threshold.`
        };

      case 'general_availability':
      default:
        return {
          userId,
          isEligible: true,
          assignedStage: 'general_availability',
          bucketPercentile: bucket,
          activeFeatureFlags: this.config.featureFlags,
          reason: 'Feature in General Availability (100% user traffic enabled).'
        };
    }
  }

  public setStage(stage: RolloutStage): void {
    this.config.currentStage = stage;
  }

  public getStage(): RolloutStage {
    return this.config.currentStage;
  }

  public getConfig(): RolloutConfig {
    return { ...this.config };
  }
}
