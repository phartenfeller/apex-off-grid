import * as SQLite from 'wa-sqlite';
import { InitSourceMsgData } from '../../globalConstants';
import { log } from '../util/logger';
import { db, sqlite3 } from './initDb';
import { addMetaEntry, checkMetaEntryExists, initMetaTable } from './metaTable';
import { Colinfo } from './types';
import checkTableExists from './util/checkTableExsists';

export async function initTables() {
  await initMetaTable();
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

async function createTable(ddl: string) {
  const res = await sqlite3.exec(db, ddl);

  if (res !== SQLite.SQLITE_OK) {
    throw new Error(`Error creating table`);
  }
}

/**
 * Syncs configured sources data with local SQLite database
 * - Check if meta entry already exists
 * - Check if table exists
 * - Create table and meta if needed
 */
export async function initSource({
  storageId,
  storageVersion,
  colData,
  pkColname,
  lastChangedColname,
}: InitSourceMsgData) {
  const tabname = `${storageId}_v${storageVersion}`;

  const metaExists = await checkMetaEntryExists(storageId, storageVersion);
  log.trace(`initSource: meta exists "${tabname}"? :`, metaExists);

  const tabExists = await checkTableExists(tabname);
  log.trace(`initSource: table exists "${tabname}"? :`, tabExists);

  if (metaExists && !tabExists) {
    log.warn(`Meta entry exists but table does not: "${tabname}"`);
  }

  if (!metaExists) {
    if (tabExists) {
      log.warn(`Table exists but meta entry does not: "${tabname}"`);
    }

    await addMetaEntry({
      storageId,
      storageVersion,
      colData,
      pkColname,
      lastChangedColname,
    });
    log.info(`added meta entry for "${tabname}"`);
  }

  if (!tabExists) {
    const sql = generateTableSource(tabname, colData, pkColname);
    log.trace('sql initSource:', sql);
  }
}
