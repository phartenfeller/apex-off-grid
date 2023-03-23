import { ajax } from '../apex/ajax';
import {
  CheckSyncRowsMsgData,
  CheckSyncRowsResponse,
  SyncServerRowsMsgData,
  SyncServerRowsResponse,
  WorkerMessageType,
  YELLOW_CONSOLE,
} from '../globalConstants';
import { sendMsgToWorker } from '../messageBus';

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
}: { storageId: string; storageVersion: number; apex: any }) {
  const { data } = await sendMsgToWorker({
    storageId,
    storageVersion,
    messageType: WorkerMessageType.SyncDone,
    data: {},
    expectedMessageType: WorkerMessageType.SyncDoneResult,
  });

  if (!data.ok) {
    apex.debug.error(`Could not update last sync date: ${data.error}`);
  }
}

export async function syncRows({
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
}) {
  if (!window.navigator.onLine) {
    apex.debug.log('Skipping sync rows. Not online.');
    return;
  }

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

  syncDone({ storageId, storageVersion, apex });
}
