import { ajax } from '../apex/ajax';
import {
  CheckSyncRowsMsgData,
  CheckSyncRowsResponse,
  CYAN_CONSOLE,
  GetLocalChangesResponse,
  SyncServerRowsMsgData,
  SyncServerRowsResponse,
  WorkerMessageType,
  YELLOW_CONSOLE,
} from '../globalConstants';
import { sendMsgToWorker } from '../messageBus';
import randomId from '../util/randomId';

export async function getLastSync({
  storageId,
  storageVersion,
}: { storageId: string; storageVersion: number }) {
  const { data } = await sendMsgToWorker({
    storageId,
    storageVersion,
    messageType: WorkerMessageType.GetLastSync,
    data: {},
    expectedMessageType: WorkerMessageType.GetLastSyncResult,
  });

  if (!data.ok) {
    throw new Error(`Could not get last sync: ${data.error}`);
  }

  return data.lastSync;
}

async function syncDone({
  storageId,
  storageVersion,
  apex,
  syncId,
}: { storageId: string; storageVersion: number; apex: any; syncId: string }) {
  const { data } = await sendMsgToWorker({
    storageId,
    storageVersion,
    messageType: WorkerMessageType.SyncDone,
    data: { syncId },
    expectedMessageType: WorkerMessageType.SyncDoneResult,
  });

  if (!data.ok) {
    apex.debug.error(`Could not update last sync date: ${data.error}`);
  } else {
    apex.debug.info(
      `%c Sync done for ${storageId} v${storageVersion}`,
      CYAN_CONSOLE,
    );
  }
}

async function sendLocalChanges({
  ajaxId,
  storageId,
  storageVersion,
  apex,
  pageSize,
}: {
  ajaxId: string;
  storageId: string;
  storageVersion: number;
  apex: any;
  pageSize: number;
}): Promise<boolean> {
  try {
    const { data } = await sendMsgToWorker({
      storageId,
      storageVersion,
      messageType: WorkerMessageType.GetLocalChanges,
      data: {},
      expectedMessageType: WorkerMessageType.GetLocalChangesResult,
    });

    const { ok, error, rows } = data as GetLocalChangesResponse;
    if (!ok) {
      apex.debug.error(`Could not get local changes: ${error}`);
      return false;
    }

    apex.debug.info(`%c GetLocalChanges result:`, YELLOW_CONSOLE, rows);

    if (rows.length === 0) {
      apex.debug.trace(`No local changes to send.`);
      return true;
    }

    // get chunks of rows equal to page size
    const chunks = [];
    for (let i = 0; i < rows.length; i += pageSize) {
      chunks.push(rows.slice(i, i + pageSize));
    }

    for (const chunk of chunks) {
      const res = (await ajax({
        apex,
        ajaxId,
        method: 'sync_client_changed_rows',
        json: { rows: chunk, storageId, storageVersion },
      })) as {
        ok: boolean;
        error?: string;
      };

      apex.debug.trace(
        `fetch sync_client_changed_rows Rows ${storageId} v${storageVersion}`,
        res,
      );

      if (!res.ok) {
        apex.debug.error(
          `Error processing local changes in the DB: ${res.error}`,
        );
        return false;
      }
    }

    return true;
  } catch (e) {
    apex.debug.error(`Error sending local changes: ${e.message}`);
    return false;
  }
}

export async function syncRows({
  ajaxId,
  storageId,
  storageVersion,
  apex,
  pageSize,
  online,
}: {
  ajaxId: string;
  storageId: string;
  storageVersion: number;
  apex: any;
  pageSize: number;
  online: boolean;
}) {
  if (!online) {
    apex.debug.log('Skipping sync rows. Not online.');
    return;
  }

  const ok = await sendLocalChanges({
    ajaxId,
    storageId,
    storageVersion,
    apex,
    pageSize,
  });

  if (!ok) {
    apex.debug.error(`Stopping sync rows. Could not send local changes.`);
    return;
  }

  const syncId = randomId();

  let hasMoreRows = true;
  let nextRow = 1;

  while (hasMoreRows) {
    const res = (await ajax({
      apex,
      ajaxId,
      method: 'sync_checksums',
      x02: nextRow,
      x03: pageSize,
    })) as {
      data: any[];
      hasMoreRows: boolean;
    };

    apex.debug.info(
      `fetch sync_checksums Rows ${storageId} v${storageVersion}`,
      res,
    );

    hasMoreRows = res.hasMoreRows;
    nextRow += pageSize;
    apex.debug.trace(`hasMoreRows: ${hasMoreRows} nextRow: ${nextRow}`);

    const payload: CheckSyncRowsMsgData = {
      storageId,
      storageVersion,
      rows: res.data,
      syncId,
    };

    const { data } = await sendMsgToWorker({
      storageId,
      storageVersion,
      messageType: WorkerMessageType.CheckSyncRows,
      data: payload,
      expectedMessageType: WorkerMessageType.CheckSyncRowsResult,
    });

    const { ok, error, needsUpdateRows } = data as CheckSyncRowsResponse;
    apex.debug.info(`%c InsertRowsResult:`, YELLOW_CONSOLE, data);

    if (!ok) {
      apex.debug.error(`Could not insert rows: ${error}`);
      return;
    }

    if (needsUpdateRows && needsUpdateRows.length > 0) {
      apex.debug.info(`%c Needs update rows:`, YELLOW_CONSOLE, needsUpdateRows);

      const chunkSize = pageSize;
      for (let i = 0; i < needsUpdateRows.length; i += chunkSize) {
        const chunk = needsUpdateRows.slice(i, i + chunkSize);

        const rows = (await ajax({
          apex,
          ajaxId,
          method: 'get_server_changed_rows',
          json: { ids: chunk.join(':') },
        })) as {
          data: any[];
        };

        apex.debug.info(
          `fetch get_server_changed_rows Rows ${storageId} v${storageVersion}`,
          rows,
        );

        const payload: SyncServerRowsMsgData = {
          storageId,
          storageVersion,
          rows: rows.data,
        };

        const { data } = await sendMsgToWorker({
          storageId,
          storageVersion,
          messageType: WorkerMessageType.SyncServerRows,
          data: payload,
          expectedMessageType: WorkerMessageType.SyncServerRowsResult,
        });

        const { ok, error } = data as SyncServerRowsResponse;
        apex.debug.info(`%c SyncServerRows result:`, YELLOW_CONSOLE, data);

        if (!ok) {
          apex.debug.error(`Could not sync server rows rows: ${error}`);
          return;
        }
      }
    }
  }

  syncDone({ storageId, storageVersion, apex, syncId });
}
