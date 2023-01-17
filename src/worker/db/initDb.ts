// import * as SQLite from 'wa-sqlite';
// import SQLiteModuleFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import { InitDbMsgData } from '../../globalConstants';
// import { OriginPrivateFileSystemVFS } from './util/PrivateFileSystemVFS.js';
import { log } from '../util/logger';
import type { Database } from 'sqlite3';
import { resolve } from 'node:path';

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
  return new Promise((resolve) => {
    try {
      self
        .sqlite3InitModule({ print: log.info, printErr: log.error })
        .then((sqlite3: any) => {
          try {
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
            resolve({ ok: true });
          } catch (e) {
            log.error(`Could not initialize database: ${e.message}`);
            resolve({ ok: false, error: e.message });
          }
        });
    } catch (e) {
      log.error(`Could not initialize database: ${e.message}`);
      resolve({ ok: false, error: e.message });
    }
  });
}
