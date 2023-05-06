import {
  DeleteLocalChangesMsgData,
  DeleteLocalChangesResponse,
  GetColInfoResponse,
  GetLocalChangesMsgData,
  GetLocalChangesResponse,
  GetRowByPkResponse,
  GetRowCountMsgData,
  GetRowCountResponse,
  GetRowsMsgData,
  GetRowsResponse,
  SyncDoneMsgData,
  SyncDoneResponse,
  WriteChangesMsgData,
  WriteChangesResponse,
} from '../../../globalConstants';
import randomId from '../../../util/randomId';
import { log } from '../../util/logger';
import { db } from '../initDb';
import { getPkColType, getStorageColumns, updateLastSync } from '../metaTable';
import { removeServerDeletedRows } from '../serverIdsTable';
import { ColStructure, DbRow } from '../types';
import { CHANGE_TS_COL, CHANGE_TYPE_COL } from '../userTables';

function prepareSearchTerm(searchTerm: string, colnames: string[]) {
  const coalescedCols = colnames.map((c) => `coalesce(${c}, '')`).join(' || ');
  return {
    where: `where (lower(${coalescedCols}) LIKE $searchTerm) and (__change_type is null or __change_type != 'D')`,
    bindVal: `%${searchTerm.replaceAll('%', '/%').toLowerCase()}%`,
  };
}

export function getColInfo(
  storageId: string,
  storageVersion: number,
): GetColInfoResponse {
  try {
    const colStructure = getStorageColumns(storageId, storageVersion);

    return {
      ok: true,
      colInfo: colStructure,
    };
  } catch (err) {
    const msg = `Error getting col info for ${storageId}_v${storageVersion}: ${err}`;
    log.error(msg);
    return {
      ok: false,
      error: msg,
    };
  }
}

export function getRowByPk(
  storageId: string,
  storageVersion: number,
  pk: string | number,
): GetRowByPkResponse {
  try {
    const colStructure = getStorageColumns(storageId, storageVersion);

    const sql = `select * from ${storageId}_v${storageVersion} where ${colStructure.pkCol} = $pk and (__change_type is null or __change_type != 'D')`;
    const binds = {
      $pk: pk,
    };
    log.trace('getRowByPk sql:', sql, binds);

    const data = db.selectObject(sql, binds) as DbRow;

    return {
      ok: true,
      row: data,
    };
  } catch (err) {
    const msg = `Error getting row by pk ${storageId}_v${storageVersion}: ${err}`;
    log.error(msg);
    return {
      ok: false,
      error: msg,
    };
  }
}

export function getRows({
  storageId,
  storageVersion,
  offset,
  maxRows,
  orderByCol,
  orderByDir = 'asc',
  searchTerm,
}: GetRowsMsgData): GetRowsResponse {
  try {
    let sql = `select * from ${storageId}_v${storageVersion} #WHERE# #ORDER_BY# #LIMIT#`;
    const colStructure = getStorageColumns(storageId, storageVersion);
    const colnames = colStructure.cols.map((c) => c.colname);

    if (orderByCol) {
      if (!colnames.includes(orderByCol.toUpperCase())) {
        log.warn(
          `Column "${orderByCol.toUpperCase()}" not found. Skipping order by for ${storageId}_v${storageVersion}`,
        );
        sql = sql.replace('#ORDER_BY#', 'order by 1');
      } else {
        const dir = orderByDir.toLowerCase() === 'desc' ? 'desc' : 'asc';

        sql = sql.replace('#ORDER_BY#', `order by ${orderByCol} ${dir}`);
      }
    } else {
      sql = sql.replace('#ORDER_BY#', 'order by 1');
    }

    const binds: { [key: string]: number | string } = {
      $limit: maxRows,
    };

    if (offset) {
      sql = sql.replace('#LIMIT#', `limit $limit offset $offset`);
      binds['$offset'] = offset;
    } else {
      sql = sql.replace('#LIMIT#', 'limit $limit');
    }

    if (searchTerm) {
      const { where, bindVal } = prepareSearchTerm(searchTerm, colnames);
      sql = sql.replace('#WHERE#', where);
      binds['$searchTerm'] = bindVal;
    } else {
      sql = sql.replace(
        '#WHERE#',
        `where (__change_type is null or __change_type != 'D')`,
      );
    }

    log.trace('getRows sql:', sql, binds);

    const data = db.selectObjects(sql, binds);

    return {
      ok: true,
      rows: data,
    };
  } catch (err) {
    const msg = `Error getting rows for ${storageId}_v${storageVersion}: ${err}`;
    log.error(msg);
    return {
      ok: false,
      error: msg,
    };
  }
}

export function getRowCount({
  storageVersion,
  storageId,
  searchTerm,
}: GetRowCountMsgData): GetRowCountResponse {
  try {
    let sql = `select count(*) as rowCount from ${storageId}_v${storageVersion} #WHERE#`;

    const binds: DbRow = {};

    if (searchTerm) {
      const colStrucure = getStorageColumns(storageId, storageVersion);
      const colnames = colStrucure.cols.map((c) => c.colname);
      const { where, bindVal } = prepareSearchTerm(searchTerm, colnames);
      sql = sql.replace('#WHERE#', where);
      binds['$searchTerm'] = bindVal;
    } else {
      sql = sql.replace('#WHERE#', '');
    }

    log.trace('getRowCount sql:', sql, binds);
    const keyCount = Object.keys(binds).length;
    const data = db.selectObject(sql, keyCount > 0 ? binds : undefined) as {
      rowCount: number;
    };

    return {
      ok: true,
      rowCount: data.rowCount,
    };
  } catch (err) {
    const msg = `Error getting row count for ${storageId}_v${storageVersion}: ${err}`;
    log.error(msg);
    return {
      ok: false,
      error: msg,
    };
  }
}

function rowsDiffer(a: DbRow, b: DbRow, userCols: string[]): boolean {
  for (const col of userCols) {
    if (a[col] !== b[col]) {
      return true;
    }
  }

  return false;
}

function fixDataTypes({
  row,
  colStructure,
}: { row: DbRow; colStructure: ColStructure }): DbRow {
  for (const col of colStructure.cols) {
    if (!row[col.colname] && row[col.colname] !== '0') {
      row[col.colname] = null;
    } else if (col.datatype === 'real') {
      row[col.colname] = parseFloat(row[col.colname] as string);
    }
  }

  return row;
}

export function writeChanges({
  storageId,
  storageVersion,
  rows,
}: WriteChangesMsgData): WriteChangesResponse {
  let loggedInsertQuery = false;
  let loggedUpdateQuery = false;
  let loggedDeleteQuery = false;
  let ok = true;

  try {
    const colStructure = getStorageColumns(storageId, storageVersion);
    const userCols = colStructure.cols
      .map((c) => c.colname)
      .filter(
        (c) => ![colStructure.pkCol, colStructure.lastChangedCol].includes(c),
      );

    db.transaction(() => {
      for (let row of rows) {
        row = fixDataTypes({ row, colStructure });
        if (!row[CHANGE_TYPE_COL]) {
          ok = false;
          log.error(
            `Row has no "${CHANGE_TYPE_COL}" property. Set this to 'I', 'U' or 'D' (${storageId}_v${storageVersion})`,
            row,
          );

          continue;
        } else if (!['I', 'U', 'D'].includes(row[CHANGE_TYPE_COL] as string)) {
          ok = false;
          log.error(
            `Row has invalid "${CHANGE_TYPE_COL}" property. Set this to 'I', 'U' or 'D' (${storageId}_v${storageVersion})`,
            row,
          );

          continue;
        }

        let sql = '';
        const binds: DbRow = {};

        switch (row[CHANGE_TYPE_COL]) {
          case 'I':
            sql = `
            insert into ${storageId}_v${storageVersion} (
              ${colStructure.cols.map((c) => c.colname).join(',\n')}
              , ${CHANGE_TS_COL}
              , ${CHANGE_TYPE_COL}
            ) values (
              ${colStructure.cols.map((c) => `$${c.colname}`).join(',\n')}
              , $${CHANGE_TS_COL}
              , $${CHANGE_TYPE_COL}
            );
          `;

            if (!row[colStructure.pkCol]) {
              const pkColType = getPkColType(colStructure);

              switch (pkColType) {
                case 'real':
                  row[colStructure.pkCol] = new Date().getTime();
                  break;

                case 'text':
                  row[colStructure.pkCol] = randomId();
                  break;

                default:
                  throw new Error(`Unknown pkColType: ${pkColType}`);
              }
            }

            for (const { colname } of colStructure.cols) {
              binds[`$${colname}`] = row[colname];
            }
            binds[`$${CHANGE_TS_COL}`] = Date.now();
            binds[`$${CHANGE_TYPE_COL}`] = row[CHANGE_TYPE_COL];

            if (!loggedInsertQuery) {
              log.trace('writeChanges insert sql:', sql, binds);
              loggedInsertQuery = true;
            }
            const insStmnt = db.prepare(sql);
            try {
              insStmnt.bind(binds);
              insStmnt.stepReset();
            } catch (err) {
              ok = false;
              log.error(
                `Error updating row (${storageId}_v${storageVersion}):`,
                err,
                sql,
                binds,
              );
            }
            insStmnt.finalize();

            break;

          case 'U':
            const dbRow = getRowByPk(
              storageId,
              storageVersion,
              row[colStructure.pkCol],
            );

            const diffs = rowsDiffer(row, dbRow.row, userCols);

            if (!diffs) {
              log.info(
                `Row ${
                  row[colStructure.pkCol]
                } has no changes (${storageId}_v${storageVersion}). Skipping...`,
                row,
              );
              continue;
            }

            sql = `
            update ${storageId}_v${storageVersion}
            set ${userCols.map((c) => `${c} = $${c}`).join(',\n')}
              , ${CHANGE_TS_COL} = $${CHANGE_TS_COL}
              , ${CHANGE_TYPE_COL} = $${CHANGE_TYPE_COL}
            where ${colStructure.pkCol} = $${colStructure.pkCol}
          `;

            for (const { colname } of colStructure.cols) {
              if (colname !== colStructure.lastChangedCol) {
                binds[`$${colname}`] = row[colname];
              }
            }
            binds[`$${CHANGE_TS_COL}`] = Date.now();
            binds[`$${CHANGE_TYPE_COL}`] = row[CHANGE_TYPE_COL];

            if (!loggedUpdateQuery) {
              log.trace('writeChanges update sql:', sql, binds);
              loggedUpdateQuery = true;
            }
            const updateStmnt = db.prepare(sql);
            try {
              updateStmnt.bind(binds);
              updateStmnt.stepReset();
            } catch (err) {
              ok = false;
              log.error(
                `Error updating row (${storageId}_v${storageVersion}):`,
                err,
                sql,
                binds,
              );
            }
            updateStmnt.finalize();

            break;

          case 'D':
            sql = `
            update ${storageId}_v${storageVersion}
            set ${CHANGE_TS_COL} = $${CHANGE_TS_COL}
              , ${CHANGE_TYPE_COL} = 'D'
            where ${colStructure.pkCol} = $${colStructure.pkCol}
          `;

            binds[`$${colStructure.pkCol}`] = row[colStructure.pkCol];
            binds[`$${CHANGE_TS_COL}`] = Date.now();

            if (!loggedDeleteQuery) {
              log.trace('writeChanges delete sql:', sql, binds);
              loggedDeleteQuery = true;
            }
            const delStmnt = db.prepare(sql);
            try {
              delStmnt.bind(binds);
              delStmnt.stepReset();
            } catch (err) {
              delStmnt.finalize();
              ok = false;
              log.error(
                `Error deleting row (${storageId}_v${storageVersion}):`,
                err,
                sql,
                binds,
              );
            }
            delStmnt.finalize();
        }
      }
    });

    return {
      ok,
      error: ok
        ? undefined
        : 'One or more rows failed to process. See browser console for more info',
    };
  } catch (err) {
    const msg = `Error writing changes for ${storageId}_v${storageVersion}: ${err}`;
    log.error(msg);
    return {
      ok: false,
      error: msg,
    };
  }
}

export function getLocalChanges({
  storageId,
  storageVersion,
}: GetLocalChangesMsgData): GetLocalChangesResponse {
  try {
    const sql = `select * from ${storageId}_v${storageVersion} where ${CHANGE_TYPE_COL} is not null`;
    const data = db.selectObjects(sql);

    return {
      ok: true,
      rows: data,
    };
  } catch (err) {
    const msg = `Error getting local change rows for ${storageId}_v${storageVersion}: ${err}`;
    log.error(msg);
    return {
      ok: false,
      error: msg,
    };
  }
}

export function syncDone({
  storageId,
  storageVersion,
  syncId,
}: SyncDoneMsgData): SyncDoneResponse {
  const structure = getStorageColumns(storageId, storageVersion);
  const pkColType = getPkColType(structure);

  let res = removeServerDeletedRows({
    syncId,
    tableName: `${storageId}_v${storageVersion}`,
    pkColname: structure.pkCol,
    pkIsNum: pkColType === 'real',
  });

  if (!res.ok) {
    return res;
  }

  res = updateLastSync({ storageId, storageVersion });

  return res;
}

export function deleteLocalChanges({
  storageId,
  storageVersion,
}: DeleteLocalChangesMsgData): DeleteLocalChangesResponse {
  const sql = `delete from ${storageId}_v${storageVersion} where ${CHANGE_TYPE_COL} is not null;`;

  try {
    db.exec(sql);

    return {
      ok: true,
    };
  } catch (err) {
    const msg = `Error deleting local change rows for ${storageId}_v${storageVersion}: ${err}`;
    log.error(msg);
    return {
      ok: false,
      error: msg,
    };
  }
}
