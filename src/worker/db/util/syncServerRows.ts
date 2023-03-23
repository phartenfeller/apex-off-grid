import { SyncServerRowsResponse } from '../../../globalConstants';
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

    let sql = `
      insert into ${storageId}_v${storageVersion} (
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
        // rome-ignore lint/performance/noDelete: <explanation>
        delete rows[i][keys[j]];
      }
    }

    for (let i = 0; i < rows.length; i++) {
      db.exec(sql, { bind: rows[i] });
    }

    return { ok: true };
  } catch (e) {
    log.error('syncServerRows error:', e);
    return {
      ok: false,
      error: e,
    };
  }
}
