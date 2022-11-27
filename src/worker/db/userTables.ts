import * as SQLite from 'wa-sqlite';
import { InitSourceMsgData } from '../../globalConstants';
import { log } from '../util/logger';
import { bindParam } from './bindParam';
import { db, sqlite3 } from './initDb';
import { Colinfo } from './types';
import { rowToObject } from './util/rowToObject';

const META_TABLE_VERSION = 1;
const META_TABLE = `_meta_v${META_TABLE_VERSION}`;

async function checkTableExists(tabname: string) {
  const sql = `select count(*) as cnt from sqlite_master where type = 'table' and lower(name) = '${tabname.toLocaleLowerCase()}'`;
  log.trace('checkTableExists sql:', sql);

  let result: boolean;

  await sqlite3.exec(db, sql, (row, columns) => {
    const data = rowToObject(row, columns);
    result = (data.cnt as number) === 1;
  });

  return result;
}

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

  await sqlite3.exec(db, sql);
  log.info('created meta table');
}

async function addMetaEntry({
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

  const str = sqlite3.str_new(db, sql);
  try {
    // Traverse and prepare the SQL, statement by statement.
    let prepared: {
      stmt: number;
      sql: number;
    } = { stmt: undefined, sql: sqlite3.str_value(str) };
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

export async function initTables() {
  const metaTableExsits = await checkMetaTableExists();
  if (!metaTableExsits) {
    await createMetaTable();
  }
}

function generateTableSource(
  tabname: string,
  colData: Colinfo[],
  pkCol: string,
) {
  let statement = `Create Table ${tabname} (`;

  const atomics: string[] = [];

  for (const col of colData) {
    atomics.push(
      `${col.colname} ${col.datatype}${
        col.datatypeLength ? `(${col.datatypeLength})` : ''
      } ${col.isRequired ? 'NOT NULL' : ''}`,
    );
  }

  atomics.push(`PRIMARY KEY (${pkCol})`);

  statement += `   ${atomics.join(', ')}    );`;

  return statement;
}

export async function initSource({
  storageId,
  storageVersion,
  colData,
  pkColname,
  lastChangedColname,
}: InitSourceMsgData) {
  const tabname = `${storageId}_v${storageVersion}`;

  const exists = await checkTableExists(tabname);
  log.trace(`initSource: table exists "${tabname}" :`, exists);

  if (!exists) {
    const sql = generateTableSource(tabname, colData, pkColname);
    log.trace('sql initSource:', sql);

    await addMetaEntry({
      storageId,
      storageVersion,
      colData,
      pkColname,
      lastChangedColname,
    });
    log.info(`added meta entry for "${tabname}"`);
  }
}
