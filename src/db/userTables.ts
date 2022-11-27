import { db, sqlite3 } from './initDb';
import { Colinfo } from './types';

const META_TABLE_VERSION = 1;
const META_TABLE = `_meta_v${META_TABLE_VERSION}`;

async function checkTableExists(tabname: string) {
  const sql = `select count(*) as cnt from sqlite_master where type = 'table' and lower(name) = '${tabname.toLocaleLowerCase()}'`;
  console.log(sql);

  await sqlite3.exec(db, sql, (row) => {
    console.log(row);
  });

  return true;
}

function checkMetaTableExists() {
  return checkTableExists(META_TABLE);
}

async function createMetaTable() {
  const sql = `CREATE TABLE ${META_TABLE} (
    storage_id TEXT NOT NULL,
    storage_version INTEGER NOT NULL,
    last_sync INTEGER,
    PRIMARY KEY (storage_id, storage_version)
  );`;

  await sqlite3.exec(db, sql);
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
  colInfo: Colinfo[],
  pkCol: string,
) {
  let statement = `Create Table ${storageId}_v${storageVersion} (`;

  const atomics: string[] = [];

  for (const col of colInfo) {
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

export function initTable(storageId: string, storageVersion: number) {
  const tabname = `${storageId}_v${storageVersion}`;

  const exists = checkTableExists(tabname);

  if (!exists) {
    const sql = generateTableSource(storageId, storageVersion, [], 'id');
    console.log(sql);
  }
}
