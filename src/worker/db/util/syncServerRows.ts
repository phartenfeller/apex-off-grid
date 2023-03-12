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

    let sql = `update ${storageId}_v${storageVersion} set 
                  #COLUMNS#
                where ${structure.pkCol} = $${structure.pkCol};`;

    const colsStatements: string[] = [];

    for (let i = 0; i < structure.cols.length; i++) {
      if (structure.cols[i].colname === structure.pkCol) {
        continue;
      }

      colsStatements.push(
        `${structure.cols[i].colname} = $${structure.cols[i].colname}`,
      );
    }

    sql = sql.replace('#COLUMNS#', colsStatements.join(',\n '));
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
