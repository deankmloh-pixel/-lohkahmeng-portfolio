CREATE TABLE IF NOT EXISTS subscribers (
  email      TEXT PRIMARY KEY,
  name       TEXT,
  created_at TEXT,
  source     TEXT
);
