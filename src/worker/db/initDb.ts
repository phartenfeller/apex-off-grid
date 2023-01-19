import { InitDbMsgData } from '../../globalConstants';
import { log } from '../util/logger';

const DB_NAME = 'file:///hartenfeller_dev_apex_offline_data.sqlite';

export let db: sqlite3oo1.DB;

declare global {
  function sqlite3InitModule(options: {
    print: object;
    printErr: object;
  }): Promise<void>;
}

function optimizeDb() {
  log.trace('Start optimizing database');
  db.exec([
    'PRAGMA analysis_limit=400;', // make sure pragma optimize does not take too long
    'PRAGMA optimize;', // gather statistics to improve query optimization
  ]);
  log.trace('Finish optimizing database');
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
              db = new opfs.OpfsDb(DB_NAME) as sqlite3oo1.DB;
              log.info('The OPFS is available.');
            } else {
              db = new oo.DB(DB_NAME, 'ct') as sqlite3oo1.DB;
              log.info('The OPFS is not available.');
            }
            log.info('transient db =', (db as any).filename);

            // optimize for speed (with safety): https://cj.rs/blog/sqlite-pragma-cheatsheet-for-performance-and-consistency/
            db.exec([
              'PRAGMA journal_mode = wal;',
              'PRAGMA synchronous = normal;',
            ]);

            setTimeout(optimizeDb, 1000 * 60 * 2); // optimize after 2 minutes

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
