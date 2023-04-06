import { SyncDoneResponse } from '../../globalConstants';
import { log } from '../util/logger';
import { db } from './initDb';
import checkTableExists from './util/checkTableExsists';

const SERVER_IDS_TABLE_VERSION = 1;
const SERVER_IDS_TABLE = `_server_ids_v${SERVER_IDS_TABLE_VERSION}`;
const NUM_COL = 'id_val_int';
const TEXT_COL = 'id_val_text';

function checkServerIdsTableExists() {
  return checkTableExists(SERVER_IDS_TABLE);
}

function createServerIdsTable() {
  const sql = `CREATE TABLE ${SERVER_IDS_TABLE} (
    sync_id TEXT NOT NULL,
    ${TEXT_COL} TEXT,
    ${NUM_COL} INTEGER
  ) strict;
  
  CREATE INDEX ${SERVER_IDS_TABLE}___sync_id ON ${SERVER_IDS_TABLE} (sync_id);`;
  log.trace('createServerIdsTable sql:', sql);

  db.exec(sql);
  log.info('created server ids table');
}

function truncateTable() {
  const sql = `DELETE FROM ${SERVER_IDS_TABLE};`;
  log.trace('truncate server ids sql:', sql);

  db.exec(sql);
}

export function initServerIdsTable() {
  const serverIdsTableExsits = checkServerIdsTableExists();
  if (!serverIdsTableExsits) {
    createServerIdsTable();
  } else {
    truncateTable();
  }
}

export function addServerIds({
  syncId,
  numIds,
  strIds,
}: {
  syncId: string;
  numIds?: number[];
  strIds?: string[];
}) {
  if (!(numIds || strIds)) {
    log.error('No ids provided to addServerIds');
    throw new Error('No ids provided');
  } else if (numIds && strIds) {
    log.error('Both numIds and strIds provided to addServerIds');
    throw new Error('Both numIds and strIds provided');
  } else if (!syncId) {
    log.error('No syncId provided to addServerIds');
    throw new Error('No syncId provided');
  }

  const sql = `INSERT INTO ${SERVER_IDS_TABLE} (
    sync_id,
    ${numIds ? NUM_COL : TEXT_COL}
  ) VALUES (
    $syncId,
    $id
  );`;

  db.transaction(() => {
    const stmnt = db.prepare(sql);
    const vals = numIds || strIds;

    try {
      for (const id of vals) {
        try {
          stmnt.bind({ $syncId: syncId, $id: id });
        } catch (err) {
          log.error(`Error binding row:`, err, 'Bind:', {
            $syncId: syncId,
            $id: id,
          });
          throw err;
        }
        stmnt.stepReset();
      }
    } catch (err) {
      log.error(`Error adding server ids:`, err);
      throw err;
    } finally {
      stmnt.finalize();
    }
  });
}

function removeServerIds(syncId: string) {
  const sql = `DELETE FROM ${SERVER_IDS_TABLE} WHERE sync_id = $syncId;`;
  log.trace('removeSyncIds sql:', sql);

  db.exec(sql, {
    bind: {
      $syncId: syncId,
    },
  });
}

export function removeServerDeletedRows({
  syncId,
  tableName,
  pkColname,
  pkIsNum,
}: {
  syncId: string;
  tableName: string;
  pkColname: string;
  pkIsNum: boolean;
}): SyncDoneResponse {
  try {
    const sql = `DELETE FROM ${tableName} WHERE ${pkColname} NOT IN ( select ${
      pkIsNum ? NUM_COL : TEXT_COL
    } from ${SERVER_IDS_TABLE} where sync_id = $syncId  )`;
    log.trace('removeServerDeletedRows sql:', sql);

    db.exec(sql, {
      bind: {
        $syncId: syncId,
      },
    });

    removeServerIds(syncId);

    return { ok: true };
  } catch (err) {
    log.error('Error removing server deleted rows:', err);
    return { ok: false, error: err };
  }
}
