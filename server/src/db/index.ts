import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATA_DIR = join(__dirname, '..', '..', 'data');
const DB_PATH = process.env.DB_PATH ?? join(DATA_DIR, 'inventory.db');

mkdirSync(DATA_DIR, { recursive: true });

// Uses Node's built-in SQLite (node:sqlite) — no native dependency to compile,
// so `npm install` needs no C++ toolchain on any platform.
const raw = new DatabaseSync(DB_PATH);
raw.exec('PRAGMA journal_mode = WAL');
raw.exec('PRAGMA foreign_keys = ON');

// Thin typed facade. node:sqlite types its rows as Record<string, value>;
// this lets call sites keep their `as MyType` casts (the same ergonomics the
// previous better-sqlite3 driver gave) while keeping all SQL in one place.
interface Statement {
  run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  get(...params: unknown[]): any;
  all(...params: unknown[]): any[];
}

export const db = {
  prepare(sql: string): Statement {
    return raw.prepare(sql) as unknown as Statement;
  },
  exec(sql: string): void {
    raw.exec(sql);
  },
};

/**
 * Run `fn` inside a single transaction (replaces better-sqlite3's
 * `db.transaction()` helper). Commits on success, rolls back on throw.
 */
export function tx<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/** Apply the schema (idempotent — uses CREATE TABLE IF NOT EXISTS). */
export function migrate(): void {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
}

migrate();
