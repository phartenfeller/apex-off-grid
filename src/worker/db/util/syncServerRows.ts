import { SyncServerRowsResponse } from '../../../globalConstants';
import getTabname from '../../util/getTabname';
import { log } from '../../util/logger';
import { db } from '../initDb';
import { getStorageColumns } from '../metaTable';

export default function syncServerRows({
  storageId,
  storageVersion,
  rows,
}: {
  storageId: string;
  storageVersion: number;
  rows: any[];
}): SyncServerRowsResponse {
  try {
    const structure = getStorageColumns(storageId, storageVersion);
    const tabname = getTabname({ storageId, storageVersion });

    let sql = `
      insert into ${tabname} (
        #INSERT_COLS#
      ) values (
        #INSERT_VALUES#
      )
      on conflict (${structure.pkCol}) do
      update set 
                  #UPDATE_ASSIGNM#
                where ${structure.pkCol} = excluded.${structure.pkCol};`;

    const insertCols: string[] = [];
    const insertBinds: string[] = [];
    const updateAssignments: string[] = [];

    for (let i = 0; i < structure.cols.length; i++) {
      if (structure.cols[i].colname === structure.pkCol) {
        insertCols.push(structure.cols[i].colname);
        insertBinds.push(`$${structure.cols[i].colname}`);
        continue;
      }

      insertCols.push(structure.cols[i].colname);
      insertBinds.push(`$${structure.cols[i].colname}`);
      updateAssignments.push(
        `${structure.cols[i].colname} = excluded.${structure.cols[i].colname}`,
      );
    }

    sql = sql.replace('#INSERT_COLS#', insertCols.join(',\n '));
    sql = sql.replace('#INSERT_VALUES#', insertBinds.join(',\n '));
    sql = sql.replace('#UPDATE_ASSIGNM#', updateAssignments.join(',\n '));
    log.trace('syncServerRows update sql:', sql);

    // add prefix $ to all keys
    for (let i = 0; i < rows.length; i++) {
      const keys = Object.keys(rows[i]);
      for (let j = 0; j < keys.length; j++) {
        rows[i][`$${keys[j]}`] = rows[i][keys[j]];
        delete rows[i][keys[j]];
      }
    }

    db.transaction(() => {
      const stmnt = db.prepare(sql);

      try {
        for (const row of rows) {
          try {
            stmnt.bind(row);
          } catch (err) {
            log.error(`Error binding row:`, err, 'Bind:', row);
            throw err;
          }
          stmnt.stepReset();
        }
      } catch (err) {
        log.error(`Error adding server ids:`, err);
        throw err;
      } finally {
        stmnt.finalize();
      }
    });

    return { ok: true };
  } catch (e) {
    log.error('syncServerRows error:', e);
    return {
      ok: false,
      error: e,
    };
  }
}
