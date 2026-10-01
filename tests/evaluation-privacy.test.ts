import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { MemoryStore } from '../src/db/memory-store.js';
import { BenchmarkEvaluator } from '../src/evaluation/evaluator.js';
import { BENCHMARK_SCENARIOS } from '../src/evaluation/benchmark-scenarios.js';
import { PrivacyAuditor } from '../src/privacy/privacy-auditor.js';
import { RolloutManager } from '../src/rollout/rollout-manager.js';
import { createApiServer } from '../src/api/server.js';
import { FixtureData } from '../src/fixtures/generate-goa-fixture.js';

describe('Phase 5: Evaluation, Privacy Hardening & Production Rollout', () => {
  let store: MemoryStore;
  let fixture: FixtureData;
  let evaluator: BenchmarkEvaluator;
  let privacyAuditor: PrivacyAuditor;
  let rolloutManager: RolloutManager;
  let apiApp: ReturnType<typeof createApiServer>;

  beforeAll(() => {
    store = new MemoryStore();
    const fixturePath = path.join(process.cwd(), 'src', 'fixtures', 'goa-trip-fixture.json');
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    fixture = JSON.parse(raw);

    for (const trip of fixture.trips) store.addTrip(trip);
    for (const ep of fixture.episodes) store.addEpisode(ep);
    for (const photo of fixture.photos) store.addMediaAsset(photo);

    evaluator = new BenchmarkEvaluator(store);
    privacyAuditor = new PrivacyAuditor();
    rolloutManager = new RolloutManager('canary_5pct');

    apiApp = createApiServer({
      store,
      rolloutManager
    });
  });

  describe('Task 1 & 3: Quality & Usability Evaluation (100 Scenarios Benchmark)', () => {
    it('should contain 100 diverse natural language memory scenarios spanning Place, Activity, People, Time', () => {
      expect(BENCHMARK_SCENARIOS.length).toBe(100);

      const multiClue = BENCHMARK_SCENARIOS.filter(s => s.category === 'multi_clue');
      const place = BENCHMARK_SCENARIOS.filter(s => s.category === 'place_dominant');
      const activity = BENCHMARK_SCENARIOS.filter(s => s.category === 'activity_dominant');
      const time = BENCHMARK_SCENARIOS.filter(s => s.category === 'time_dominant');
      const people = BENCHMARK_SCENARIOS.filter(s => s.category === 'people_dominant');

      expect(multiClue.length).toBeGreaterThanOrEqual(20);
      expect(place.length).toBeGreaterThanOrEqual(15);
      expect(activity.length).toBeGreaterThanOrEqual(15);
      expect(time.length).toBeGreaterThanOrEqual(15);
      expect(people.length).toBeGreaterThanOrEqual(10);
    });

    it('should achieve Anchor Accuracy@1 >= 85% and sub-250ms p95 retrieval latency across all 100 scenarios', async () => {
      const report = await evaluator.runBenchmark();

      console.log(`\n======================================================`);
      console.log(`📊 BENCHMARK EVALUATION RESULTS (100 Scenarios)`);
      console.log(`- Anchor Accuracy@1: ${report.overallAccuracyAt1}% (Target: >= 85%)`);
      console.log(`- Anchor Accuracy@3: ${report.overallAccuracyAt3}%`);
      console.log(`- Time-to-Relive Reduction: ${report.timeToReliveMetric.percentageReduction}% (Target: >= 65%)`);
      console.log(`- Retrieval Latency p50: ${report.retrievalLatency.p50}ms | p95: ${report.retrievalLatency.p95}ms`);
      console.log(`======================================================\n`);

      expect(report.totalScenarios).toBe(100);
      expect(report.overallAccuracyAt1).toBeGreaterThanOrEqual(85.0);
      expect(report.overallAccuracyAt3).toBeGreaterThanOrEqual(90.0);
      expect(report.targetAccuracyMet).toBe(true);

      // Verify Time-to-Relive target reduction (>= 65%)
      expect(report.timeToReliveMetric.targetReductionMet).toBe(true);
      expect(report.timeToReliveMetric.percentageReduction).toBeGreaterThanOrEqual(65.0);

      // Verify latency budget: p95 retrieval latency < 250ms (in fact < 10ms with in-memory HNSW scoring)
      expect(report.retrievalLatency.p95).toBeLessThan(250);
    });
  });

  describe('Task 2: Privacy Audit & Zero-Trust User Partitioning', () => {
    it('should pass on-device biometric isolation audit (zero raw biometric templates on server)', () => {
      const photos = store.getAllMediaAssets();
      const audit = privacyAuditor.auditBiometricIsolation(photos);

      expect(audit.passed).toBe(true);
      expect(audit.rawTemplatesDetected).toBe(0);
      expect(audit.inspectedPhotosCount).toBe(photos.length);
    });

    it('should flag a violation if raw facial embeddings are accidentally sent to the server', () => {
      const violatingPhotos = [
        {
          ...fixture.photos[0],
          photoId: 'photo_leak_01',
          detectedPeople: [
            {
              personId: 'p_rohan',
              displayName: 'Rohan',
              relationshipGroup: 'friends' as const,
              confidence: 0.99,
              faceEmbedding: new Array(512).fill(0.12) // VIOLATION: Raw biometric vector!
            } as any
          ]
        }
      ];

      const audit = privacyAuditor.auditBiometricIsolation(violatingPhotos);
      expect(audit.passed).toBe(false);
      expect(audit.rawTemplatesDetected).toBe(1);
    });

    it('should enforce Ephemeral Query Processing with Zero Data Retention (ZDR)', () => {
      const ephemeralCheck = privacyAuditor.auditEphemeralQueries();
      expect(ephemeralCheck.passed).toBe(true);
      expect(ephemeralCheck.zeroRetentionCompliant).toBe(true);
    });

    it('should enforce zero-trust multi-tenant boundary isolation between distinct users', () => {
      const tenantCheck = privacyAuditor.auditTenantIsolation(store, 'user_demo_01', 'unauthorized_attacker_99');
      expect(tenantCheck.passed).toBe(true);
      expect(tenantCheck.crossTenantLeakageDetected).toBe(false);
    });

    it('should execute full privacy audit and report 100% compliance', () => {
      const fullAudit = privacyAuditor.runFullAudit(store);
      expect(fullAudit.passed).toBe(true);
      expect(fullAudit.biometricIsolationCheck.passed).toBe(true);
      expect(fullAudit.ephemeralQueryCheck.passed).toBe(true);
      expect(fullAudit.tenantPartitionCheck.passed).toBe(true);
    });
  });

  describe('Task 4: Phased Rollout & Canary Deployment', () => {
    it('should consistently hash user IDs into deterministic buckets [0..99]', () => {
      const bucket1 = rolloutManager.getUserBucket('user_alice');
      const bucket2 = rolloutManager.getUserBucket('user_alice');
      const bucket3 = rolloutManager.getUserBucket('user_bob');

      expect(bucket1).toBe(bucket2); // deterministic
      expect(bucket1).toBeGreaterThanOrEqual(0);
      expect(bucket1).toBeLessThan(100);
      expect(typeof bucket3).toBe('number');
    });

    it('should grant internal dogfood access to whitelisted IDs and corporate domains', () => {
      const eval1 = rolloutManager.evaluateUser('user_demo_01');
      expect(eval1.isEligible).toBe(true);
      expect(eval1.assignedStage).toBe('internal_dogfood');

      const eval2 = rolloutManager.evaluateUser('random_user_123', 'alice@google.com');
      expect(eval2.isEligible).toBe(true);
      expect(eval2.assignedStage).toBe('internal_dogfood');
    });

    it('should restrict standard users based on 5% canary cohort threshold', () => {
      rolloutManager.setStage('canary_5pct');

      // Test multiple users across population
      let inCanary = 0;
      for (let i = 0; i < 100; i++) {
        const evalUser = rolloutManager.evaluateUser(`user_sample_${i}`);
        if (evalUser.isEligible) inCanary++;
      }

      // Over 100 sample users, expect approximately ~5% eligible
      expect(inCanary).toBeGreaterThanOrEqual(1);
      expect(inCanary).toBeLessThanOrEqual(15);
    });

    it('should enable 100% of user traffic in General Availability', () => {
      rolloutManager.setStage('general_availability');

      for (let i = 0; i < 20; i++) {
        const evalUser = rolloutManager.evaluateUser(`random_ga_user_${i}`);
        expect(evalUser.isEligible).toBe(true);
        expect(evalUser.assignedStage).toBe('general_availability');
        expect(evalUser.activeFeatureFlags.enableSemanticTimeline).toBe(true);
      }
    });
  });

  describe('Phase 5 REST API Integration Endpoints', () => {
    it('GET /api/v1/evaluation/benchmark should return complete evaluation report with Accuracy@1', async () => {
      const res = await request(apiApp)
        .get('/api/v1/evaluation/benchmark')
        .set('x-user-id', 'user_demo_01');

      expect(res.status).toBe(200);
      expect(res.body.totalScenarios).toBe(100);
      expect(res.body.overallAccuracyAt1).toBeGreaterThanOrEqual(85.0);
      expect(res.body.targetAccuracyMet).toBe(true);
      expect(res.body.timeToReliveMetric.percentageReduction).toBeGreaterThanOrEqual(65.0);
    });

    it('GET /api/v1/privacy/audit should return 100% compliant privacy checks', async () => {
      const res = await request(apiApp)
        .get('/api/v1/privacy/audit')
        .set('x-user-id', 'user_demo_01');

      expect(res.status).toBe(200);
      expect(res.body.passed).toBe(true);
      expect(res.body.biometricIsolationCheck.passed).toBe(true);
      expect(res.body.ephemeralQueryCheck.passed).toBe(true);
    });

    it('GET /api/v1/rollout/status should return user evaluation and active feature flags', async () => {
      const res = await request(apiApp)
        .get('/api/v1/rollout/status')
        .set('x-user-id', 'user_demo_01');

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe('user_demo_01');
      expect(res.body.isEligible).toBe(true);
      expect(res.body.activeFeatureFlags.enableSemanticTimeline).toBe(true);
    });
  });
});
