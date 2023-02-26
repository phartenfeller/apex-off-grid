import { InitSourceMsgData, InitSourceResponse } from '../../globalConstants';
import { log } from '../util/logger';
import { db } from './initDb';
import { addMetaEntry, checkMetaEntryExists, initMetaTable } from './metaTable';
import { Colinfo, Datatype } from './types';
import checkTableEmpty from './util/checkTableEmptry';
import checkTableExists from './util/checkTableExsists';

export async function initTables() {
  await initMetaTable();
}

function getDatatype(type: Datatype, length?: number) {
  // text has no precision
  if (type === 'text') {
    return type;
  }

  if (length) {
    return `${type}(${length})`;
  }
  return type;
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
      `${col.colname} ${getDatatype(col.datatype, col.datatypeLength)} ${
        col.isRequired ? 'NOT NULL' : ''
      }`,
    );
  }

  atomics.push(`__change_type text check (__change_type in ('I', 'U', 'D'))`);
  atomics.push(`PRIMARY KEY (${pkCol})`);

  statement += `   ${atomics.join(', ')}    ) strict;`;

  statement += `CREATE INDEX ${tabname}___change_type ON ${tabname} (__change_type);`;

  return statement;
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
}: InitSourceMsgData): Promise<InitSourceResponse> {
  try {
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
      db.exec(sql);
      log.info(`created table "${tabname}"`);
    }

    const isEmpty = checkTableEmpty(tabname);

    return { ok: true, isEmpty };
  } catch (err) {
    log.error('initSource error:', err);
    return { ok: false, error: err.message };
  }
}
