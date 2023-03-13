// @ts-ignore
import { ajax } from './apex/ajax';
import {
  DbStatus,
  InitDbMsgData,
  InitDbPayloadData,
  InitSourceMsgData,
  InitSourceResponse,
  InsertRowsMsgData,
  InsertRowsResponse,
  WorkerMessageParams,
  WorkerMessageType,
  YELLOW_CONSOLE,
} from './globalConstants';
import { initMsgBus, sendMsgToWorker } from './messageBus';
import initStorageMethods from './storageMethods';
import syncRows from './sync';
import { Colinfo } from './worker/db/types';

declare global {
  interface Window {
    apex: any;
    hartenfeller_dev: any;
  }
}

let gFilePrefix = '';

const apex = window.apex;

const worker = new Worker(
  /* webpackChunkName: "sqlite-worker" */ new URL(
    './worker/sqlite-worker.ts',
    import.meta.url,
  ),
);

let initDbRetries = 0;

async function initDb() {
  if (
    window.hartenfeller_dev.plugins.sync_offline_data.dbStauts !==
    DbStatus.NotInitialized
  ) {
    // already initialized (maybe by another plugin instance)
    return;
  }

  if (!gFilePrefix) {
    if (initDbRetries < 20) {
      initDbRetries++;
      setTimeout(() => initDb(), 100);
    } else {
      apex.debug.error('filePrefix is emptry after 20 retries...');
    }
    return;
  }

  window.hartenfeller_dev.plugins.sync_offline_data.dbStauts =
    DbStatus.Initializing;

  const initDbPayload: InitDbPayloadData = {
    loglevel: apex.debug.getLevel(),
    filePrefix: gFilePrefix,
  };
  const { messageType, data } = await sendMsgToWorker({
    storageId: 'initDb',
    storageVersion: 1,
    messageType: WorkerMessageType.InitDb,
    data: initDbPayload,
  });

  if (messageType !== WorkerMessageType.InitDbResult) {
    apex.debug.error(`Unexpected message type: ${messageType}`);
    return;
  }

  apex.debug.info('%c initDb result', YELLOW_CONSOLE, data);
  const { ok, error } = data as InitDbMsgData;

  if (ok) {
    window.hartenfeller_dev.plugins.sync_offline_data.dbStauts =
      DbStatus.Initialized;
  } else {
    window.hartenfeller_dev.plugins.sync_offline_data.dbStauts = DbStatus.Error;
    apex.debug.error(`Could not initialize DB: ${error}`);
  }
}

worker.addEventListener(
  'message',
  async ({ data }: { data: WorkerMessageParams }) => {
    apex.debug.info(`Message received from Worker: ${data.messageType}`, data);

    if (data.messageType === WorkerMessageType.Loaded) {
      apex.debug.info('Worker loaded');
      initMsgBus(worker, apex);
      initDb();
    } else {
      apex.debug.error(
        `Excpected message type ${WorkerMessageType.Loaded} but got: ${data.messageType}`,
      );
    }
  },
  { once: true },
);

function setFilePrefix({ filePrefix }: { filePrefix: string }) {
  gFilePrefix = filePrefix;
}

let initStorageRetries = 0;

async function fetchAllRows({
  ajaxId,
  storageId,
  storageVersion,
}: {
  ajaxId: string;
  storageId: string;
  storageVersion: number;
}) {
  let hasMoreRows = true;
  const pageSize = 50;
  let nextRow = 1;

  while (hasMoreRows) {
    const res = (await ajax({
      apex,
      ajaxId,
      method: 'fetch_data',
      x02: nextRow,
      x03: pageSize,
    })) as {
      data: any[];
      hasMoreRows: boolean;
    };

    apex.debug.info(`fetchAllRows ${storageId} v${storageVersion}`, res);

    hasMoreRows = res.hasMoreRows;
    nextRow += pageSize;

    const payload: InsertRowsMsgData = {
      storageId,
      storageVersion,
      rows: res.data,
    };

    const { data } = await sendMsgToWorker({
      storageId,
      storageVersion,
      messageType: WorkerMessageType.InsertRows,
      data: payload,
      expectedMessageType: WorkerMessageType.InsertRowsResult,
    });

    const { ok, error } = data as InsertRowsResponse;
    apex.debug.info(`%c InsertRowsResult:`, YELLOW_CONSOLE, data);

    if (!ok) {
      apex.debug.error(`Could not insert rows: ${error}`);
      return;
    }
  }
}

async function initStorage({
  ajaxId,
  storageId,
  storageVersion,
  pkColname,
  lastChangedColname,
}: {
  ajaxId: string;
  storageId: string;
  storageVersion: number;
  pkColname: string;
  lastChangedColname: string;
}) {
  if (
    window.hartenfeller_dev.plugins.sync_offline_data.dbStauts !==
    DbStatus.Initialized
  ) {
    if (initStorageRetries < 20) {
      initStorageRetries++;
      setTimeout(
        () =>
          initStorage({
            ajaxId,
            storageId,
            storageVersion,
            pkColname,
            lastChangedColname,
          }),
        1000,
      );
    } else {
      apex.debug.error('Could not initialize Storage. Message from:', {
        storageId,
        storageVersion,
      });
    }
    return;
  }

  apex.debug.info('initStorage', {
    ajaxId,
    storageId,
    storageVersion,
    pkColname,
    lastChangedColname,
  });

  const res = (await ajax({ apex, ajaxId, method: 'source_structure' })) as any;

  if (!res?.source_structure) {
    apex.debug.error('No source_structure in response', res);
    return;
  }

  const colData: Colinfo[] = res.source_structure;

  const payload: InitSourceMsgData = {
    storageId,
    storageVersion,
    colData,
    pkColname,
    lastChangedColname,
  };

  const { data } = await sendMsgToWorker({
    storageId,
    storageVersion,
    messageType: WorkerMessageType.InitSource,
    data: payload,
    expectedMessageType: WorkerMessageType.InitSourceResult,
  });

  const { ok, error, isEmpty } = data as InitSourceResponse;
  apex.debug.info('%c initStorage result', YELLOW_CONSOLE, data);

  if (!ok) {
    apex.debug.error(`Could not initialize Storage: ${error}`);
    return;
  }

  initStorageMethods(storageId, storageVersion, apex);

  if (isEmpty === true) {
    fetchAllRows({ ajaxId, storageId, storageVersion });
  } else {
    syncRows({ ajaxId, storageId, storageVersion, apex });
  }
}

if (!window.hartenfeller_dev) {
  window.hartenfeller_dev = {};
}
if (!window.hartenfeller_dev.plugins) {
  window.hartenfeller_dev.plugins = {};
}
if (!window.hartenfeller_dev.plugins.sync_offline_data) {
  window.hartenfeller_dev.plugins.sync_offline_data = {};
}
if (!window.hartenfeller_dev.plugins.sync_offline_data.sync) {
  window.hartenfeller_dev.plugins.sync_offline_data.setFilePrefix =
    setFilePrefix;
  window.hartenfeller_dev.plugins.sync_offline_data.initStorage = initStorage;

  window.hartenfeller_dev.plugins.sync_offline_data.dbStauts =
    DbStatus.NotInitialized;

  window.hartenfeller_dev.plugins.sync_offline_data.storages = {};
}
