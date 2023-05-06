import { DB } from 'sqlite3oo1';
import { InitDbMsgData } from '../../globalConstants';
import { log } from '../util/logger';

const DB_NAME = 'file:///hartenfeller_dev_apex_offline_data.sqlite';

export let db: DB;

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
    'PRAGMA vacuum;', // remove unused space
  ]);
  log.trace('Finish optimizing database');
}

const logX = (...args: any[]) => console.log(...args);
const errorX = (...args: any[]) => console.error(...args);

export async function initDb(): Promise<InitDbMsgData> {
  log.trace('Start initializing database in worker', self);
  return new Promise((resolve) => {
    try {
      self
        .sqlite3InitModule(
          {
            print: logX,
            printErr: errorX,
          },
          // {
          //   print: console.log,
          //   printErr: console.error,
          // },
          // { print: log.info, printErr: log.error }
        )
        .then((sqlite3: any) => {
          try {
            log.info('Initialized sqlite3 module.', sqlite3);
            const oo = sqlite3?.oo1 as any;
            //const opfs = sqlite3?.opfs as any;
            const capi = sqlite3.capi as any;
            const opfsFound = capi.sqlite3_vfs_find('opfs');
            log.info(
              'sqlite3 version',
              capi.sqlite3_libversion(),
              capi.sqlite3_sourceid(),
              `OPFS? ==> ${opfsFound}`,
            );
            if (opfsFound) {
              db = new oo.OpfsDb(DB_NAME) as DB;
              log.info('The OPFS is available.');
            } else {
              const message =
                'The OPFS is not available. You may need to set these headers: https://sqlite.org/wasm/doc/trunk/persistence.md#:~:text=%E2%9A%A0%EF%B8%8FAchtung%3A%20COOP%20and%20COEP%20HTTP%20Headers or use a modern browser.';
              log.error(message);
              throw new Error(message);
            }
            log.info('transient db =', (db as any).filename);

            // optimize for speed (with safety): https://cj.rs/blog/sqlite-pragma-cheatsheet-for-performance-and-consistency/
            db.exec([
              'PRAGMA journal_mode = wal;',
              'PRAGMA synchronous = normal;',
            ]);

            setTimeout(optimizeDb, 1000 * 60 * 10); // optimize after 10 minutes
            log.trace('DB', db);

            resolve({ ok: true });
          } catch (e) {
            log.error(`Could not initialize database: ${e.message}`);
            resolve({ ok: false, error: e.message });
          }
        })
        .catch((e: any) => {
          throw e;
        });
    } catch (e) {
      log.error(`Could not initialize database: ${e.message}`);
      resolve({ ok: false, error: e.message });
    }
  });
}
