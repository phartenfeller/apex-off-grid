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

export default async function syncRows({
  ajaxId,
  storageId,
  storageVersion,
  apex,
}: {
  ajaxId: string;
  storageId: string;
  storageVersion: number;
  apex: any;
}) {
  let hasMoreRows = true;
  const pageSize = 150;
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
          x02: chunk.join(','),
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
}
