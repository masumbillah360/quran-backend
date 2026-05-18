import path from 'path';
import { fileURLToPath } from 'url';
import { Database } from "bun:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'quran.db');

export function getDatabase() {
    const db = new Database(DB_PATH);
    db.run('PRAGMA foreign_keys = ON');
    db.run('PRAGMA journal_mode = WAL');
    return db;
}

export { DB_PATH };
