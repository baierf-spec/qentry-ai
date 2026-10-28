-- Qentry initial schema

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,            -- sha256 of the session token
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE businesses (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  color TEXT NOT NULL DEFAULT '#FFD23F',
  layout TEXT NOT NULL DEFAULT 'split',
  languages TEXT NOT NULL DEFAULT '["en"]',   -- JSON array, first = primary
  greeting TEXT NOT NULL DEFAULT '{}',        -- JSON {lang: text}
  hours TEXT NOT NULL DEFAULT '{}',           -- JSON {mon: "10-19", ...}
  heads_up INTEGER NOT NULL DEFAULT 2,
  hold_min INTEGER NOT NULL DEFAULT 3,
  max_len INTEGER NOT NULL DEFAULT 30,
  voice INTEGER NOT NULL DEFAULT 1,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_business_owner ON businesses(owner_id);

CREATE TABLE members (
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff',          -- owner | staff
  PRIMARY KEY (business_id, user_id)
);

CREATE TABLE services (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                          -- primary language
  names TEXT NOT NULL DEFAULT '{}',            -- JSON {lang: name}
  minutes INTEGER NOT NULL DEFAULT 20,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE stations (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  staff_name TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE tvs (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  code TEXT,                                   -- pairing code while unpaired
  code_expires INTEGER,
  name TEXT NOT NULL DEFAULT 'TV',
  lang_mode TEXT NOT NULL DEFAULT 'rotate',    -- rotate | primary
  last_seen INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_tvs_code ON tvs(code);

CREATE TABLE visits (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  ticket TEXT NOT NULL,
  service_id TEXT,
  station_id TEXT,
  name TEXT,                                   -- wiped after 24h
  lang TEXT NOT NULL DEFAULT 'en',
  joined_at INTEGER NOT NULL,
  called_at INTEGER,
  finished_at INTEGER,
  status TEXT NOT NULL                         -- served | left | noshow
);
CREATE INDEX idx_visits_business_time ON visits(business_id, joined_at);
