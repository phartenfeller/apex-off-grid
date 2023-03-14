import {
  GetColInfoResponse,
  GetRowByPkResponse,
  GetRowsResponse,
  WorkerMessageType,
} from './globalConstants';
import { sendMsgToWorker } from './messageBus';
import { OrderByDir } from './worker/db/types';

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
}: {
  storageId: string;
  storageVersion: number;
  apex: any;
  offset: number;
  maxRows: number;
  orderByCol?: string;
  orderByDir?: OrderByDir;
}) {
  const { data } = await sendMsgToWorker({
    storageId,
    storageVersion,
    messageType: WorkerMessageType.GetRows,
    data: { offset, maxRows, orderByCol, orderByDir },
    expectedMessageType: WorkerMessageType.GetRowsResponse,
  });

  const { ok, error, rows } = data as GetRowsResponse;

  if (!ok) {
    apex.debug.error(`Could not get rows: ${error}`);
    return;
  }

  return rows;
}

export default function initStorageMethods(
  storageId: string,
  storageVersion: number,
  apex: any,
) {
  const storageName = `${storageId}_v${storageVersion}`;

  window.hartenfeller_dev.plugins.sync_offline_data.storages[storageName] = {
    getColInfo: () => _getColInfo(storageId, storageVersion, apex),
    getRowByPk: (pk: string | number) =>
      _getRowByPk(storageId, storageVersion, pk, apex),
    getRows: ({
      offset = 0,
      maxRows = 100,
      orderByCol,
      orderByDir,
    }: {
      offset: number;
      maxRows?: number;
      orderByCol?: string;
      orderByDir?: OrderByDir;
    }) =>
      _getRows({
        storageId,
        storageVersion,
        apex,
        offset,
        maxRows,
        orderByCol,
        orderByDir,
      }),
  };
}
