// import * as SQLite from 'wa-sqlite';
// import SQLiteModuleFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import { InitDbMsgData } from '../../globalConstants';
// import { OriginPrivateFileSystemVFS } from './util/PrivateFileSystemVFS.js';
import { log } from '../util/logger';
import type { Database } from 'sqlite3';

const DB_NAME = 'file:///hartenfeller_dev_apex_offline_data.sqlite';

export let sqlite3: any;
export let db: Database;

declare global {
  function sqlite3InitModule(options: {
    print: object;
    printErr: object;
  }): Promise<void>;
}

export async function initDb(): Promise<InitDbMsgData> {
  try {
    /*
    const mod = await SQLiteModuleFactory();
    sqlite3 = SQLite.Factory(mod);
    // @ts-ignore
    sqlite3.vfs_register(new OriginPrivateFileSystemVFS(), true);

    const oo = (sqlite3 as any)?.oo1 as any;
    console.log('oo1', oo);

    db = await sqlite3.open_v2(
      DB_NAME,
      SQLite.SQLITE_OPEN_CREATE |
        SQLite.SQLITE_OPEN_READWRITE |
        SQLite.SQLITE_OPEN_URI,
      'opfs',
    );
    await sqlite3.exec(db, PREAMBLE);
    log.info('Database succefully initialized!');
    return { ok: true };
    */

    self
      .sqlite3InitModule({ print: log.info, printErr: log.error })
      .then((res: any) => {
        try {
          const { sqlite3 } = res;
          log.info('Initialized sqlite3 module.', sqlite3);
          const oo = sqlite3?.oo1 as any;
          const opfs = sqlite3?.opfs as any;
          const capi = sqlite3.capi as any;
          log.info(
            'sqlite3 version',
            capi.sqlite3_libversion(),
            capi.sqlite3_sourceid(),
            `OPFS? ${capi.sqlite3_vfs_find('opfs')}`,
          );
          if (opfs) {
            db = new opfs.OpfsDb(DB_NAME) as Database;
            log.info('The OPFS is available.');
          } else {
            db = new oo.DB(DB_NAME, 'ct') as Database;
            log.info('The OPFS is not available.');
          }
          log.info('transient db =', (db as any).filename);
          return { ok: true };
        } catch (e) {
          log.error(`Could not initialize database: ${e.message}`);
          return { ok: false };
        }
      });
  } catch (e) {
    log.error(`Could not initialize database: ${e.message}`);
    return { ok: false, error: e.message };
  }
}
