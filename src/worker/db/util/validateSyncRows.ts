import { CheckSyncRowsResponse } from '../../../globalConstants';
import { log } from '../../util/logger';
import { db } from '../initDb';
import { getPkColType, getStorageColumns } from '../metaTable';

export default function validateSyncRows({
  storageId,
  storageVersion,
  rows,
}: {
  storageId: string;
  storageVersion: number;
  rows: any[];
}): CheckSyncRowsResponse {
  try {
    const structure = getStorageColumns(storageId, storageVersion);

    const pkColType = getPkColType(structure);

    let pkList: string;
    if (pkColType === 'real') {
      pkList = rows.map((row) => row[structure.pkCol]).join(', ');
    } else {
      pkList = rows.map((row) => `'${row[structure.pkCol]}'`).join(', ');
    }

    const sql = `select ${structure.pkCol} as pk, ${structure.lastChangedCol} as lc from ${storageId}_v${storageVersion} where ${structure.pkCol} in (${pkList})  ;`;
    log.trace('validateSyncRows sql:', sql);

    const data = db.selectObjects(sql);

    const dbValsMap = new Map<number | string, number>();
    data.forEach(({ pk, lc }: { pk: number | string; lc: number }) => {
      dbValsMap.set(pk, lc);
    });

    const needsUpdateRows: (string | number)[] = [];

    rows.forEach((r) => {
      const pk = r[structure.pkCol] as number | string;

      if (dbValsMap.has(pk)) {
        const lc = dbValsMap.get(pk);
        if (lc !== r[structure.lastChangedCol]) {
          // last_changed is different
          needsUpdateRows.push(pk);
        }
      } else {
        // pk is not in db
        needsUpdateRows.push(pk);
      }
    });

    return { ok: true, needsUpdateRows };
  } catch (e) {
    log.error('Error validating sync rows:', e);
    return {
      ok: false,
      error: `Error validating sync rows: ${e}`,
    };
  }
}
