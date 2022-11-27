import { InitSourceMsgData } from '../../globalConstants';
import { log } from '../util/logger';
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
    PRIMARY KEY (storage_id, storage_version)
  );`;

  await sqlite3.exec(db, sql);
  log.info('created meta table');
}

export async function initTables() {
  const metaTableExsits = await checkMetaTableExists();
  if (!metaTableExsits) {
    await createMetaTable();
  }
}

function generateTableSource(
  storageId: string,
  storageVersion: number,
  colData: Colinfo[],
  pkCol: string,
) {
  let statement = `Create Table ${storageId}_v${storageVersion} (`;

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
}: InitSourceMsgData) {
  const tabname = `${storageId}_v${storageVersion}`;

  const exists = await checkTableExists(tabname);
  log.trace(`initSource: table exists "${tabname}" :`, exists);

  if (!exists) {
    const sql = generateTableSource(storageId, storageVersion, colData, 'id');
    log.trace('sql initSource:', sql);
  }
}
