import * as fs from 'fs';
import * as path from 'path';
import { createApiServer } from './server.js';
import { MemoryStore } from '../db/memory-store.js';
import { FixtureData } from '../fixtures/generate-goa-fixture.js';
import * as dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3001;

function bootstrap(): void {
  const store = new MemoryStore();

  // Seed fixture data
  const fixturePath = path.join(process.cwd(), 'src', 'fixtures', 'goa-trip-fixture.json');
  if (fs.existsSync(fixturePath)) {
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    const fixture: FixtureData = JSON.parse(raw);
    for (const trip of fixture.trips) store.addTrip(trip);
    for (const ep of fixture.episodes) store.addEpisode(ep);
    for (const photo of fixture.photos) store.addMediaAsset(photo);
    console.log(`[API Server] Seeded ${fixture.photos.length} photos, ${fixture.episodes.length} episodes, and ${fixture.trips.length} trips.`);
  }

  const app = createApiServer({ store });

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Google Photos Semantic Discovery API Server running!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🔎 Search: POST http://localhost:${PORT}/api/v1/memories/search`);
    console.log(`📜 Window: GET  http://localhost:${PORT}/api/v1/timeline/window`);
    console.log(`❤️ Health: GET  http://localhost:${PORT}/health`);
    console.log(`=======================================================`);
  });
}

bootstrap();
