import * as SQLite from 'wa-sqlite';
import { InitSourceMsgData } from '../../globalConstants';
import { log } from '../util/logger';
import { bindParam } from './bindParam';
import { db, sqlite3 } from './initDb';
import checkTableExists from './util/checkTableExsists';

const META_TABLE_VERSION = 1;
const META_TABLE = `_meta_v${META_TABLE_VERSION}`;

function checkMetaTableExists() {
  return checkTableExists(META_TABLE);
}

async function createMetaTable() {
  const sql = `CREATE TABLE ${META_TABLE} (
    storage_id TEXT NOT NULL,
    storage_version INTEGER NOT NULL,
    column_structure TEXT NOT NULL,
    last_sync INTEGER,
    last_changed_column TEXT NOT NULL,
    primary_key_column TEXT NOT NULL,
    PRIMARY KEY (storage_id, storage_version)
  );`;
  log.trace('createMetaTable sql:', sql);

  await sqlite3.exec(db, sql);
  log.info('created meta table');
}

export async function addMetaEntry({
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
    ?,
    ?,
    ?,
    ?,
    ?
  );`;
  log.trace(sql);

  const str = sqlite3.str_new(db, sql);
  try {
    // Traverse and prepare the SQL, statement by statement.
    let prepared: {
      stmt: number;
      sql: number;
    } = { stmt: undefined, sql: sqlite3.str_value(str) };
    // rome-ignore lint/nursery/noConditionalAssignment: <explanation>
    while ((prepared = await sqlite3.prepare_v2(db, prepared.sql))) {
      try {
        await bindParam('storageId', prepared.stmt, 1, storageId);
        await bindParam('storageVersion', prepared.stmt, 2, storageVersion);
        await bindParam('colData', prepared.stmt, 3, JSON.stringify(colData));
        await bindParam('pkColname', prepared.stmt, 4, pkColname);
        await bindParam(
          'lastChangedColname',
          prepared.stmt,
          5,
          lastChangedColname,
        );

        // Step through the rows produced by the statement.
        while ((await sqlite3.step(prepared.stmt)) === SQLite.SQLITE_ROW) {
          log.trace(`statement "${prepared.sql}" succeeded`);
        }
      } finally {
        sqlite3.finalize(prepared.stmt);
      }
    }
  } finally {
    sqlite3.str_finish(str);
  }
}

/*
export async function removeMetaEntry({ storageId, storageVersion }: {storageId: string, storageVersion: number}}) {
  const sql = `
    DELETE FROM ${META_TABLE}
    WHERE storage_id = ? AND storage_version = ?;`;

  log.trace('removeMetaEntry sql:', sql);


  await sqlite3.exec({sql, bind: [storageId, storageVersion]});
}
*/

export async function initMetaTable() {
  const metaTableExsits = await checkMetaTableExists();
  if (!metaTableExsits) {
    await createMetaTable();
  }
}

export async function checkMetaEntryExists(
  storageId: string,
  storageVersion: number,
) {
  const sql = `select count(*) from ${META_TABLE} where storage_id = ? and storage_version = ?;`;
  log.trace('checkMetaEntryExists sql:', sql);

  const str = sqlite3.str_new(db, sql);

  try {
    // Traverse and prepare the SQL, statement by statement.
    let prepared: {
      stmt: number;
      sql: number;
    } = { stmt: undefined, sql: sqlite3.str_value(str) };
    // rome-ignore lint/nursery/noConditionalAssignment: <explanation>
    while ((prepared = await sqlite3.prepare_v2(db, prepared.sql))) {
      try {
        await bindParam('storageId', prepared.stmt, 1, storageId);
        await bindParam('storageVersion', prepared.stmt, 2, storageVersion);

        // Step through the rows produced by the statement.
        while ((await sqlite3.step(prepared.stmt)) === SQLite.SQLITE_ROW) {
          const count = sqlite3.column_int(prepared.stmt, 0);
          return count > 0;
        }
      } finally {
        sqlite3.finalize(prepared.stmt);
      }
    }
  } finally {
    sqlite3.str_finish(str);
  }
}
