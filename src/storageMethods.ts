import { GetColInfoResponse, WorkerMessageType } from './globalConstants';
import { sendMsgToWorker } from './messageBus';

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
    apex.debug.error(`Could not sync server rows rows: ${error}`);
    return;
  }

  return data.colInfo;
}

export default function initStorageMethods(
  storageId: string,
  storageVersion: number,
  apex: any,
) {
  const storageName = `${storageId}_v${storageVersion}`;

  window.hartenfeller_dev.plugins.sync_offline_data.storages[storageName] = {
    getColInfo: () => _getColInfo(storageId, storageVersion, apex),
  };
}
