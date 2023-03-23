import {
  GetColInfoResponse,
  GetRowByPkResponse,
  GetRowCountMsgData,
  GetRowCountResponse,
  GetRowsMsgData,
  GetRowsResponse,
  WriteChangesMsgData,
  WriteChangesResponse,
} from '../../../globalConstants';
import { log } from '../../util/logger';
import { db } from '../initDb';
import { getStorageColumns } from '../metaTable';
import { ColStructure, DbRow } from '../types';

const CHANGE_TYPE = '__change_type';

function prepareSearchTerm(searchTerm: string, colnames: string[]) {
  const coalescedCols = colnames.map((c) => `coalesce(${c}, '')`).join(' || ');
  return {
    where: `where (lower(${coalescedCols}) LIKE $searchTerm)`,
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

    const sql = `select * from ${storageId}_v${storageVersion} where ${colStructure.pkCol} = $pk`;
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
      sql = sql.replace('#WHERE#', '');
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
  let loggedUpadteQuery = false;
  let ok = true;

  try {
    const colStructure = getStorageColumns(storageId, storageVersion);
    const userCols = colStructure.cols
      .map((c) => c.colname)
      .filter(
        (c) => ![colStructure.pkCol, colStructure.lastChangedCol].includes(c),
      );

    for (let row of rows) {
      row = fixDataTypes({ row, colStructure });
      if (!row[CHANGE_TYPE]) {
        ok = false;
        log.error(
          `Row has no "${CHANGE_TYPE}" property. Set this to 'I', 'U' or 'D' (${storageId}_v${storageVersion})`,
          row,
        );

        continue;
      } else if (!['I', 'U', 'D'].includes(row[CHANGE_TYPE] as string)) {
        ok = false;
        log.error(
          `Row has invalid "${CHANGE_TYPE}" property. Set this to 'I', 'U' or 'D' (${storageId}_v${storageVersion})`,
          row,
        );

        continue;
      }

      switch (row[CHANGE_TYPE]) {
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

          const sql = `
            update ${storageId}_v${storageVersion}
            set ${userCols.map((c) => `${c} = $${c}`).join(',\n')}
              , ${colStructure.lastChangedCol} = $${colStructure.lastChangedCol}
            where ${colStructure.pkCol} = $${colStructure.pkCol}
          `;

          const binds: DbRow = {};
          for (const { colname } of colStructure.cols) {
            binds[`$${colname}`] = row[colname];
          }

          binds[`$${colStructure.lastChangedCol}`] = new Date().getTime();

          if (!loggedUpadteQuery) {
            log.trace('writeChanges update sql:', sql, binds);
            loggedUpadteQuery = true;
          }
          const stmnt = db.prepare(sql);
          try {
            stmnt.bind(binds);
            stmnt.stepReset();
          } catch (err) {
            stmnt.finalize();
            ok = false;
            log.error(
              `Error updating row (${storageId}_v${storageVersion}):`,
              err,
              sql,
              binds,
            );
          }
          stmnt.finalize();

          break;
      }
    }

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
