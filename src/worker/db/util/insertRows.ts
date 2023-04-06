import { InsertRowsResponse } from '../../../globalConstants';
import { log } from '../../util/logger';
import { db } from '../initDb';
import { getStorageColumns } from '../metaTable';

export default function insertRows({
  storageId,
  storageVersion,
  rows,
}: {
  storageId: string;
  storageVersion: number;
  rows: any[];
}): InsertRowsResponse {
  try {
    const structure = getStorageColumns(storageId, storageVersion);

    const colnames = structure.cols.map((col) => col.colname);
    const colnamesStr = colnames.join(', ');
    const colnamesStrBind = colnames.map((col) => `$${col}`).join(', ');
    const sql = `INSERT INTO ${storageId}_v${storageVersion} (${colnamesStr}) VALUES (${colnamesStrBind});`;
    log.trace('insertRows sql:', sql);

    const bind = rows.map((row) => {
      const bind = {} as any;
      colnames.forEach((colname) => {
        bind[`$${colname}`] = row[colname];
      });
      return bind;
    });
    log.trace('insertRows bind:', bind);

    db.transaction(() => {
      const stmnt = db.prepare(sql);

      try {
        bind.forEach((bind) => {
          try {
            stmnt.bind(bind);
          } catch (err) {
            log.error(`Error binding row:`, err, 'Bind:', bind);
            throw err;
          }
          stmnt.stepReset();
        });
      } catch (err) {
        const msg = `Error inserting rows into ${storageId}_v${storageVersion} in bind phase: ${err.message}`;
        log.error(msg, err);
        throw err;
      } finally {
        stmnt.finalize();
      }
    });

    return { ok: true };
  } catch (e) {
    log.error('Error inserting rows into ${storageId}_v${storageVersion}:', e);
    return {
      ok: false,
      error: `Error inserting rows into ${storageId}_v${storageVersion}: ${e}`,
    };
  }
}
