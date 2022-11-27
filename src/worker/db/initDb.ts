import * as SQLite from 'wa-sqlite';
import SQLiteModuleFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import { InitDbMsgData } from '../../globalConstants.js';
import { OriginPrivateFileSystemVFS } from '../PrivateFileSystemVFS.js';

const DB_NAME = 'file:///hartenfeller_dev_apex_offline_data.sqlite';
const PREAMBLE = `-- Pre-run setup
PRAGMA journal_mode=WAL;`;

export let sqlite3: SQLiteAPI;
export let db: number;

export async function initDb(): Promise<InitDbMsgData> {
  try {
    const mod = await SQLiteModuleFactory();
    sqlite3 = SQLite.Factory(mod);
    // @ts-ignore
    sqlite3.vfs_register(new OriginPrivateFileSystemVFS(), true);

    db = await sqlite3.open_v2(
      DB_NAME,
      SQLite.SQLITE_OPEN_CREATE |
        SQLite.SQLITE_OPEN_READWRITE |
        SQLite.SQLITE_OPEN_URI,
      'opfs',
    );
    await sqlite3.exec(db, PREAMBLE);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
