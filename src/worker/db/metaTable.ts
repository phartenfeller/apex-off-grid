import {
  GetLastSyncResponse,
  InitSourceMsgData,
  StorageInfo,
  SyncDoneResponse,
} from '../../globalConstants';
import { log } from '../util/logger';
import { db } from './initDb';
import { ColStructure, Colinfo } from './types';
import checkTableExists from './util/checkTableExsists';

const META_TABLE_VERSION = 1;
const META_TABLE = `_meta_v${META_TABLE_VERSION}`;

function checkMetaTableExists() {
  return checkTableExists(META_TABLE);
}

function createMetaTable() {
  const sql = `CREATE TABLE ${META_TABLE} (
    storage_id TEXT NOT NULL,
    storage_version INTEGER NOT NULL,
    column_structure TEXT NOT NULL,
    last_sync INTEGER,
    last_changed_column TEXT NOT NULL,
    primary_key_column TEXT NOT NULL,
    PRIMARY KEY (storage_id, storage_version)
  ) strict;`;
  log.trace('createMetaTable sql:', sql);

  db.exec(sql);
  log.info('created meta table');
}

export function removeMetaEntry({ storageId, storageVersion }: StorageInfo) {
  const exists = checkMetaEntryExists(storageId, storageVersion);
  if (!exists) {
    return;
  }

  const sql = `DELETE FROM ${META_TABLE} WHERE storage_id = $storageId AND storage_version = $storageVersion;`;
  log.trace('removeMetaEntry sql:', sql);

  db.exec(sql, {
    bind: { $storageId: storageId, $storageVersion: storageVersion },
  });
}

export function addMetaEntry({
  storageId,
  storageVersion,
  colData,
  pkColname,
  lastChangedColname,
}: InitSourceMsgData) {
  const sql = `INSERT INTO ${META_TABLE} (
    storage_id,
    storage_version,
    column_structure,
    primary_key_column,
    last_changed_column
  ) VALUES (
    $storageId,
    $storageVersion,
    $colData,
    $pkColname,
    $lastChangedColname
  );`;
  log.trace(sql);

  db.exec(sql, {
    bind: {
      $storageId: storageId,
      $storageVersion: storageVersion,
      $colData: JSON.stringify(colData),
      $pkColname: pkColname,
      $lastChangedColname: lastChangedColname,
    },
  });
}

/*
export function removeMetaEntry({ storageId, storageVersion }: {storageId: string, storageVersion: number}}) {
  const sql = `
    DELETE FROM ${META_TABLE}
    WHERE storage_id = ? AND storage_version = ?;`;

  log.trace('removeMetaEntry sql:', sql);


   sqlite3.exec({sql, bind: [storageId, storageVersion]});
}
*/

export function initMetaTable() {
  const metaTableExsits = checkMetaTableExists();
  if (!metaTableExsits) {
    createMetaTable();
  }
}

export function checkMetaEntryExists(
  storageId: string,
  storageVersion: number,
) {
  const sql = `select count(*) as cnt from ${META_TABLE} where storage_id = $storageId and storage_version = $storageVersion;`;
  log.trace('checkMetaEntryExists sql:', sql);

  const data = db.selectObject(sql, {
    $storageId: storageId,
    $storageVersion: storageVersion,
  }) as { cnt: number };
  const result = data.cnt > 0;
  log.trace('checkMetaEntryExists result:', result);

  return result;
}

export function getStorageColumns(
  storageId: string,
  storageVersion: number,
): ColStructure {
  const exists = checkMetaEntryExists(storageId, storageVersion);
  if (!exists) {
    throw new Error(
      `Meta entry does not exist for ${storageId} v${storageVersion}`,
    );
  }

  const sql = `select column_structure as colsStr, last_changed_column as lastChangedCol, primary_key_column as pkCol from ${META_TABLE} where storage_id = $storageId and storage_version = $storageVersion;`;
  log.trace('getStorageColumns sql:', sql);

  const data = db.selectObject(sql, {
    $storageId: storageId,
    $storageVersion: storageVersion,
  }) as { colsStr: string; lastChangedCol: string; pkCol: string };

  const info: ColStructure = {
    lastChangedCol: data.lastChangedCol,
    pkCol: data.pkCol,
    cols: JSON.parse(data.colsStr) as Colinfo[],
  };

  log.trace('getStorageColumns result:', data);

  return info;
}

export function getPkColType(structure: ColStructure) {
  const pkCol = structure.cols.find(
    (col) => col.colname === structure.pkCol,
  ) as Colinfo;
  return pkCol.datatype;
}

export function getLastSync({
  storageId,
  storageVersion,
}: StorageInfo): GetLastSyncResponse {
  const sql = `select last_sync as lastSync from ${META_TABLE} where storage_id = $storageId and storage_version = $storageVersion;`;
  const binds = {
    $storageId: storageId,
    $storageVersion: storageVersion,
  };
  log.trace('getLastSync sql:', sql, binds);

  try {
    const data = db.selectObject(sql, binds) as { lastSync: number };

    log.trace('getLastSync result:', data);

    return { ok: true, lastSync: data.lastSync };
  } catch (e) {
    log.error('getLastSync error:', e);
    return { ok: false, lastSync: 0, error: e.message };
  }
}

export function updateLastSync({
  storageId,
  storageVersion,
}: StorageInfo): SyncDoneResponse {
  const sql = `update ${META_TABLE} set last_sync = $lastSync where storage_id = $storageId and storage_version = $storageVersion;`;
  const binds = {
    $storageId: storageId,
    $storageVersion: storageVersion,
    $lastSync: Date.now(),
  };
  log.trace('updateLastSync sql:', sql, binds);

  try {
    db.exec(sql, { bind: binds });
    return { ok: true };
  } catch (e) {
    log.error('updateLastSync error:', e);
    return { ok: false, error: e.message };
  }
}
