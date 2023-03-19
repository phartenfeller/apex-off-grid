import {
  GetColInfoResponse,
  GetRowByPkResponse,
  GetRowCountMsgData,
  GetRowCountResponse,
  GetRowsMsgData,
  GetRowsResponse,
} from '../../../globalConstants';
import { log } from '../../util/logger';
import { db } from '../initDb';
import { getStorageColumns } from '../metaTable';
import { DbRow } from '../types';

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
      const coalescedCols = colnames
        .map((c) => `coalesce(${c}, '')`)
        .join(' || ');
      sql = sql.replace(
        '#WHERE#',
        `where (lower(${coalescedCols}) LIKE $searchTerm)`,
      );
      binds['$searchTerm'] = `%${searchTerm
        .replaceAll('%', '/%')
        .toLowerCase()}%`;
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
}: GetRowCountMsgData): GetRowCountResponse {
  try {
    const sql = `select count(*) as rowCount from ${storageId}_v${storageVersion}`;
    const data = db.selectObject(sql) as { rowCount: number };

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
