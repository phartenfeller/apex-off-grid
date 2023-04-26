import { callStorageCallbacks } from '.';
import {
  GetColInfoResponse,
  GetRowByPkResponse,
  GetRowCountResponse,
  GetRowsResponse,
  WorkerMessageType,
} from './globalConstants';
import { sendMsgToWorker } from './messageBus';
import { syncRows } from './sync';
import { StorageInfo } from './types';
import { DbRow, OrderByDir } from './worker/db/types';

async function _getColInfo(
  storageId: string,
  storageVersion: number,
  apex: any,
) {
  const { data } = await sendMsgToWorker({
    storageId,
    storageVersion,
    messageType: WorkerMessageType.GetColInfo,
    data: undefined,
    expectedMessageType: WorkerMessageType.GetColInfoResponse,
  });

  const { ok, error } = data as GetColInfoResponse;

  if (!ok) {
    apex.debug.error(`Could not get col info: ${error}`);
    return;
  }

  return data.colInfo;
}

async function _getRowByPk(
  storageId: string,
  storageVersion: number,
  pk: string | number,
  apex: any,
) {
  if (!pk && pk !== 0) {
    apex.debug.error('Could not get row by pk. No pk provided.');
    return;
  }

  const { data } = await sendMsgToWorker({
    storageId,
    storageVersion,
    messageType: WorkerMessageType.GetRowByPk,
    data: { pk },
    expectedMessageType: WorkerMessageType.GetRowByPkResponse,
  });

  const { ok, error, row } = data as GetRowByPkResponse;

  if (!ok) {
    apex.debug.error(`Could not get row by pk: ${error}`);
    return;
  }

  return row;
}

async function _getRows({
  storageId,
  storageVersion,
  apex,
  offset,
  maxRows,
  orderByCol,
  orderByDir,
  searchTerm,
}: StorageInfo & {
  apex: any;
  offset: number;
  maxRows: number;
  orderByCol?: string;
  orderByDir?: OrderByDir;
  searchTerm?: string;
}) {
  const { data } = await sendMsgToWorker({
    storageId,
    storageVersion,
    messageType: WorkerMessageType.GetRows,
    data: { offset, maxRows, orderByCol, orderByDir, searchTerm },
    expectedMessageType: WorkerMessageType.GetRowsResponse,
  });

  const { ok, error, rows } = data as GetRowsResponse;

  if (!ok) {
    apex.debug.error(`Could not get rows: ${error}`);
    return;
  }

  return rows;
}

async function _getRowCount({
  storageId,
  storageVersion,
  apex,
  searchTerm,
}: StorageInfo & {
  apex: any;
  searchTerm?: string;
}) {
  const { data } = await sendMsgToWorker({
    storageId,
    storageVersion,
    messageType: WorkerMessageType.GetRowCount,
    data: { searchTerm },
    expectedMessageType: WorkerMessageType.GetRowCountResponse,
  });

  const { ok, error, rowCount } = data as GetRowCountResponse;

  if (!ok) {
    apex.debug.error(`Could not get rows: ${error}`);
    return;
  }

  return rowCount;
}

async function _writeChanges({
  storageId,
  storageVersion,
  rows,
  apex,
}: StorageInfo & {
  rows: DbRow[];
  apex: any;
}) {
  if (!rows?.length || rows.length === 0) {
    apex.debug.error('Could not write changes. No rows provided.');
    return;
  }

  const { data } = await sendMsgToWorker({
    storageId,
    storageVersion,
    messageType: WorkerMessageType.WriteChanges,
    data: { rows },
    expectedMessageType: WorkerMessageType.WriteChangesResponse,
  });

  const { ok, error } = data as GetRowCountResponse;

  if (!ok) {
    apex.debug.error(`Could not write changes: ${error}`);
    return;
  }

  return { ok, error };
}

function _sync({
  storageId,
  storageVersion,
  pageSize,
  apex,
  ajaxId,
}: StorageInfo & {
  pageSize?: number;
  apex: any;
  ajaxId: string;
}) {
  syncRows({
    ajaxId,
    storageId,
    storageVersion,
    apex,
    pageSize,
    online: navigator.onLine,
  });
}

export type StorageMethodConfig = {
  pageSize?: number;
};

export default function initStorageMethods({
  storageId,
  storageVersion,
  apex,
  pageSize,
  ajaxId,
}: StorageInfo & {
  apex: any;
  pageSize?: number;
  ajaxId: string;
}) {
  const storageName = `${storageId}_v${storageVersion}`;

  window.hartenfeller_dev.plugins.sync_offline_data.storages[storageName] = {
    isReady: false,
    config: { pageSize } as StorageMethodConfig,
    getColInfo: () => _getColInfo(storageId, storageVersion, apex),
    getRowByPk: (pk: string | number) =>
      _getRowByPk(storageId, storageVersion, pk, apex),
    getRows: ({
      offset = 0,
      maxRows = 100,
      orderByCol,
      orderByDir,
      searchTerm,
    }: {
      offset: number;
      maxRows?: number;
      orderByCol?: string;
      orderByDir?: OrderByDir;
      searchTerm?: string;
    }) =>
      _getRows({
        storageId,
        storageVersion,
        apex,
        offset,
        maxRows,
        orderByCol,
        orderByDir,
        searchTerm,
      }),
    getRowCount: ({ searchTerm }: { searchTerm: string }) =>
      _getRowCount({ storageId, storageVersion, apex, searchTerm }),
    writeChanges: (rows: DbRow[]) =>
      _writeChanges({ storageId, storageVersion, rows, apex }),
    sync: () => _sync({ storageId, storageVersion, apex, pageSize, ajaxId }),
  };
}

export function setStorageReady({
  storageId,
  storageVersion,
  apex,
}: StorageInfo & { apex: any }) {
  const storageName = `${storageId}_v${storageVersion}`;

  window.hartenfeller_dev.plugins.sync_offline_data.storages[
    storageName
  ].isReady = true;

  apex.event.trigger('body', 'single_storage_ready', {
    storageId,
    storageVersion,
  });

  callStorageCallbacks({ storageId, storageVersion });
}
