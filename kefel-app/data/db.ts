/**
 * SQLite schema + migration runner (expo-sqlite, async API).
 *
 * Schema is intentionally minimal — we store only what learning + reporting
 * need (data minimization). JSON columns hold the few array/record fields so
 * the row model stays flat and queryable.
 */
import * as SQLite from 'expo-sqlite';

export const DB_NAME = 'kefel_kesem.db';

/** Ordered migrations; `user_version` PRAGMA tracks the applied count. */
const MIGRATIONS: string[] = [
  // v1 — initial schema
  `
  CREATE TABLE IF NOT EXISTS child_profile (
    id TEXT PRIMARY KEY, nickname TEXT NOT NULL, avatar TEXT NOT NULL,
    createdAt INTEGER NOT NULL, audioInstructions INTEGER NOT NULL DEFAULT 1,
    reducedMotion INTEGER NOT NULL DEFAULT 0, dailyGoalActivities INTEGER NOT NULL DEFAULT 3
  );
  CREATE TABLE IF NOT EXISTS parent_profile (
    id TEXT PRIMARY KEY, authUid TEXT, email TEXT, privacyAcceptedAt INTEGER,
    analyticsEnabled INTEGER NOT NULL DEFAULT 0, syncEnabled INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS mastery (
    childId TEXT NOT NULL, factId TEXT NOT NULL, status TEXT NOT NULL,
    attempts INTEGER, correct INTEGER, independentCorrect INTEGER, hintCount INTEGER,
    medianLatencyMs REAL, transferSuccess INTEGER, lapseCount INTEGER,
    consecutiveIndependent INTEGER, consecutiveErrors INTEGER, intervalIndex INTEGER,
    lastSeenAt INTEGER, nextDueAt INTEGER, recentLatenciesMs TEXT,
    PRIMARY KEY (childId, factId)
  );
  CREATE INDEX IF NOT EXISTS idx_mastery_due ON mastery(childId, nextDueAt);
  CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY, childId TEXT NOT NULL, factId TEXT NOT NULL,
    shownA INTEGER, shownB INTEGER, outcome TEXT, usedHint INTEGER, scaffolded INTEGER,
    isTransferItem INTEGER, latencyMs INTEGER, sessionId TEXT, activity TEXT, at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_attempts_child_at ON attempts(childId, at);
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, childId TEXT NOT NULL, startedAt INTEGER, endedAt INTEGER,
    activities TEXT, itemsPlanned INTEGER, itemsAnswered INTEGER, correct INTEGER,
    hintsUsed INTEGER, starsEarned INTEGER, completed INTEGER, quitEarly INTEGER, factsMastered TEXT
  );
  CREATE TABLE IF NOT EXISTS rewards (
    childId TEXT PRIMARY KEY, stars INTEGER, unlockedCosmetics TEXT, equippedCosmetics TEXT
  );
  CREATE TABLE IF NOT EXISTS badges (
    childId TEXT NOT NULL, id TEXT NOT NULL, earnedAt INTEGER, PRIMARY KEY (childId, id)
  );
  CREATE TABLE IF NOT EXISTS streak (
    childId TEXT PRIMARY KEY, weeklyCount INTEGER, weekKey TEXT, shieldAvailable INTEGER,
    lastActiveDayKey TEXT, longestWeeklyCount INTEGER
  );
  CREATE TABLE IF NOT EXISTS daily_goal (
    childId TEXT NOT NULL, dayKey TEXT NOT NULL, targetActivities INTEGER,
    completedActivities INTEGER, met INTEGER, PRIMARY KEY (childId, dayKey)
  );
  `,
];

export type DB = SQLite.SQLiteDatabase;

export async function openDb(name = DB_NAME): Promise<DB> {
  const db = await SQLite.openDatabaseAsync(name);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await runMigrations(db);
  return db;
}

async function runMigrations(db: DB): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.execAsync(MIGRATIONS[v]!);
  }
  if (current < MIGRATIONS.length) {
    await db.execAsync(`PRAGMA user_version = ${MIGRATIONS.length};`);
  }
}
