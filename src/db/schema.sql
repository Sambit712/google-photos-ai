-- ============================================================================
-- Google Photos Semantic Memory Discovery & Timeline Engine
-- Database DDL & Migrations (PostgreSQL with pgvector & PostGIS extensions)
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector for 768-dim embeddings

-- 2. Trips Table (Macro-Events)
CREATE TABLE IF NOT EXISTS trips (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    destination_country VARCHAR(100),
    destination_state VARCHAR(100),
    destination_city VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_photos INT DEFAULT 0,
    cover_photo_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trips_user_dates ON trips(user_id, start_date, end_date);

-- 3. Memory Episodes Table (Micro-Events / Anchors)
CREATE TABLE IF NOT EXISTS memory_episodes (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    trip_id VARCHAR(64) REFERENCES trips(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    time_of_day_bucket VARCHAR(32) NOT NULL, -- 'dawn','morning','afternoon','golden_hour','evening','night'
    
    -- Geospatial Context
    country VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    neighborhood VARCHAR(150),
    poi_name VARCHAR(150),
    poi_category VARCHAR(64), -- 'cafe', 'beach', 'restaurant', 'scenic_viewpoint', etc.
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    
    -- Keyframe & Aggregates
    anchor_photo_id VARCHAR(64) NOT NULL,
    photo_count INT NOT NULL DEFAULT 1,
    activity_tags TEXT[] DEFAULT '{}',
    coherence_score REAL DEFAULT 1.0,
    
    -- 768-dimensional visual centroid embedding (SigLIP / ViT)
    centroid_embedding vector(768),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_episodes_user_time ON memory_episodes(user_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_episodes_geo ON memory_episodes(user_id, state, poi_category);
CREATE INDEX IF NOT EXISTS idx_episodes_time_bucket ON memory_episodes(user_id, time_of_day_bucket);

-- HNSW Vector Index on Episode Centroid Embeddings (Cosine Distance)
CREATE INDEX IF NOT EXISTS idx_episodes_centroid_hnsw 
ON memory_episodes 
USING hnsw (centroid_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Media Assets Table
CREATE TABLE IF NOT EXISTS media_assets (
    photo_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    episode_id VARCHAR(64) REFERENCES memory_episodes(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    time_of_day_bucket VARCHAR(32) NOT NULL,
    
    -- Spatial attributes
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    poi_name VARCHAR(150),
    poi_category VARCHAR(64),
    
    -- Semantic visual tags & activities
    scene_tags TEXT[] DEFAULT '{}',
    activity_tags TEXT[] DEFAULT '{}',
    caption TEXT,
    aesthetic_score REAL DEFAULT 0.8,
    is_keyframe_candidate BOOLEAN DEFAULT FALSE,
    
    -- 768-dimensional individual photo embedding
    visual_embedding vector(768),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_user_timestamp ON media_assets(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_media_episode ON media_assets(episode_id);

-- HNSW Vector Index on Media Visual Embeddings
CREATE INDEX IF NOT EXISTS idx_media_visual_hnsw 
ON media_assets 
USING hnsw (visual_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 5. Face / Person Clusters Table (Edge-Synced or Federated Identity)
CREATE TABLE IF NOT EXISTS person_clusters (
    person_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    relationship_group VARCHAR(32) NOT NULL DEFAULT 'friends', -- 'friends', 'family', 'colleagues'
    photo_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_person_user ON person_clusters(user_id, relationship_group);

-- 6. Media-Person Association (Many-to-Many)
CREATE TABLE IF NOT EXISTS media_persons (
    photo_id VARCHAR(64) REFERENCES media_assets(photo_id) ON DELETE CASCADE,
    person_id VARCHAR(64) REFERENCES person_clusters(person_id) ON DELETE CASCADE,
    confidence REAL DEFAULT 1.0,
    PRIMARY KEY (photo_id, person_id)
);

-- 7. Episode-Person Association
CREATE TABLE IF NOT EXISTS episode_participants (
    episode_id VARCHAR(64) REFERENCES memory_episodes(id) ON DELETE CASCADE,
    person_id VARCHAR(64) REFERENCES person_clusters(person_id) ON DELETE CASCADE,
    PRIMARY KEY (episode_id, person_id)
);
