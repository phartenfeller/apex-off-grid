import {
  CheckSyncRowsMsgData,
  CheckSyncRowsResponse,
} from '../../../globalConstants';
import { log } from '../../util/logger';
import { db } from '../initDb';
import { getPkColType, getStorageColumns } from '../metaTable';
import { addServerIds } from '../serverIdsTable';

export default function validateSyncRows({
  storageId,
  storageVersion,
  rows,
  syncId,
}: CheckSyncRowsMsgData): CheckSyncRowsResponse {
  try {
    const structure = getStorageColumns(storageId, storageVersion);
    const pkColType = getPkColType(structure);

    let pkList: string;
    if (pkColType === 'real') {
      const pkArr: number[] = rows.map((row) => row[structure.pkCol] as number);
      addServerIds({ syncId, numIds: pkArr });
      pkList = pkArr.join(', ');
    } else {
      const pkArr: string[] = rows.map((row) => row[structure.pkCol] as string);
      addServerIds({ syncId, strIds: pkArr });
      pkList = pkArr.map((v) => `'${v}'`).join(', ');
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
