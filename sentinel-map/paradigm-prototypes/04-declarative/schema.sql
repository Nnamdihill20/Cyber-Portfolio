-- Prototype 4 - DECLARATIVE - schema
--
-- Declares the *shape* of the data (what a report is, what columns and
-- types it has) with no instructions about how rows get read, written, or
-- searched later - that's left entirely to the query planner.

CREATE TABLE reports (
  id            INTEGER PRIMARY KEY,
  activity_type TEXT NOT NULL,
  lat           REAL NOT NULL,
  lon           REAL NOT NULL,
  reported_at   TEXT NOT NULL
);
