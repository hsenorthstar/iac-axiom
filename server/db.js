/* Real database layer — SQLite via better-sqlite3.
   The single source of truth. Both the web client and (a future) mobile app
   read/write these same rows through the API. */
import { DatabaseSync } from "node:sqlite"; // built into Node 20.6+/22 — zero native deps
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "..", "data", "iac.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

export function migrate() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    handle TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password TEXT,            -- demo: plaintext-less; we accept any password for seeded demo accounts
    role TEXT NOT NULL DEFAULT 'PROFESSIONAL',
    title TEXT, region TEXT, verified INTEGER DEFAULT 0,
    powerScore INTEGER DEFAULT 0, xp INTEGER DEFAULT 0, level INTEGER DEFAULT 1,
    avatar TEXT, bio TEXT,
    badges TEXT DEFAULT '[]', skills TEXT DEFAULT '[]', certs TEXT DEFAULT '[]', reviews TEXT DEFAULT '[]',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL, sector TEXT, region TEXT, verified INTEGER DEFAULT 0,
    safetyScore INTEGER, safetyKingRank INTEGER, openRoles INTEGER DEFAULT 0,
    ltifr REAL, blurb TEXT
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    clientId TEXT NOT NULL,
    title TEXT NOT NULL, category TEXT, region TEXT, location TEXT, remote INTEGER DEFAULT 0,
    summary TEXT, scope TEXT DEFAULT '[]', skills TEXT DEFAULT '[]',
    clientBudget INTEGER NOT NULL,     -- CONFIDENTIAL: never serialised to a client
    fairRateFloor INTEGER NOT NULL,
    bestValue INTEGER NOT NULL,
    bids INTEGER DEFAULT 0,
    deadline TEXT, status TEXT DEFAULT 'OPEN', urgency TEXT DEFAULT 'med',
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (clientId) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    professionalId TEXT NOT NULL,
    amount INTEGER, note TEXT, status TEXT DEFAULT 'DRAFT',
    deliveryDays INTEGER DEFAULT 20, score INTEGER DEFAULT 80,
    createdAt TEXT DEFAULT (datetime('now')),
    UNIQUE(projectId, professionalId)
  );

  CREATE TABLE IF NOT EXISTS engagements (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL, bidId TEXT, professionalId TEXT NOT NULL,
    status TEXT DEFAULT 'IN_PROGRESS', deliveryAmount INTEGER, currency TEXT DEFAULT 'INR',
    startedAt TEXT, completedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    engagementId TEXT NOT NULL,
    title TEXT, amount INTEGER, currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'PENDING', dueAt TEXT, approvedAt TEXT,
    FOREIGN KEY (engagementId) REFERENCES engagements(id)
  );

  CREATE TABLE IF NOT EXISTS deliverables (
    id TEXT PRIMARY KEY,
    engagementId TEXT NOT NULL, milestoneId TEXT,
    title TEXT, status TEXT DEFAULT 'IN_REVIEW', submittedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS earnings_ledger (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL, type TEXT, amount INTEGER, currency TEXT DEFAULT 'INR',
    tdsWithheld INTEGER DEFAULT 0, reference TEXT, description TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recognition_ledger (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL, type TEXT, points INTEGER, reason TEXT, reference TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    companyId TEXT, title TEXT, type TEXT, region TEXT, location TEXT,
    comp TEXT, skills TEXT DEFAULT '[]', postedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT, lessons INTEGER, level TEXT, cert INTEGER DEFAULT 0, tag TEXT
  );
  CREATE TABLE IF NOT EXISTS enrollments (
    userId TEXT, courseId TEXT, pct INTEGER DEFAULT 0,
    PRIMARY KEY (userId, courseId)
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    authorId TEXT, title TEXT, body TEXT, tag TEXT,
    likes INTEGER DEFAULT 0, comments INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL, withCompanyId TEXT, subject TEXT,
    updatedAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    threadId TEXT NOT NULL, sender TEXT, text TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL, kind TEXT, title TEXT, body TEXT,
    readAt TEXT, createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS awards (
    id TEXT PRIMARY KEY, type TEXT, winner TEXT, year INTEGER, note TEXT
  );

  CREATE TABLE IF NOT EXISTS coi_records (
    id TEXT PRIMARY KEY, engagementId TEXT, referrerId TEXT, professionalId TEXT,
    createdAt TEXT DEFAULT (datetime('now')), resolvedAt TEXT
  );
  CREATE TABLE IF NOT EXISTS payouts (
    id TEXT PRIMARY KEY, userId TEXT, amount INTEGER, status TEXT DEFAULT 'PENDING',
    createdAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS admin_actions (
    id TEXT PRIMARY KEY, adminId TEXT, action TEXT, targetType TEXT, targetId TEXT,
    metadata TEXT, createdAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS referrals (
    userId TEXT PRIMARY KEY, code TEXT, invited INTEGER DEFAULT 0, joined INTEGER DEFAULT 0, earnedXp INTEGER DEFAULT 0
  );
  `);
}

export const uid = (p = "x") => p + "_" + Math.random().toString(36).slice(2, 9);
