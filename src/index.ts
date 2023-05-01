// @ts-ignore
import { ajax } from './apex/ajax';
import cachePage from './apex/pageCache';
import {
  DbStatus,
  GetRegionDataMsgData,
  InitDbMsgData,
  InitDbPayloadData,
  InitSourceMsgData,
  InitSourceResponse,
  InsertRowsMsgData,
  InsertRowsResponse,
  MergeRegionDataMsgData,
  WorkerMessageParams,
  WorkerMessageType,
  YELLOW_CONSOLE,
} from './globalConstants';
import { initMsgBus, sendMsgToWorker } from './messageBus';
import initStorageMethods, { setStorageReady } from './storageMethods';
import { syncRows, getLastSync } from './sync';
import { StorageInfo } from './types';
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
  pageSize,
}: StorageInfo & {
  ajaxId: string;
  pageSize: number;
}) {
  let hasMoreRows = true;
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
  pageSize = 500,
  syncTimeoutMins = 60,
  online = navigator.onLine,
}: StorageInfo & {
  ajaxId: string;
  pkColname: string;
  lastChangedColname: string;
  pageSize?: number;
  syncTimeoutMins?: number;
  online?: boolean;
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
            online,
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

  const payload: InitSourceMsgData = { storageId, storageVersion };

  if (online) {
    const res = (await ajax({
      apex,
      ajaxId,
      method: 'source_structure',
    })) as any;

    if (!res?.source_structure) {
      apex.debug.error('No source_structure in response', res);
      return;
    }

    const colData: Colinfo[] = res.source_structure;

    payload.colData = colData;
    payload.pkColname = pkColname;
    payload.lastChangedColname = lastChangedColname;
  }

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

  initStorageMethods({ storageId, storageVersion, apex, pageSize, ajaxId });

  if (isEmpty === true) {
    await fetchAllRows({ ajaxId, storageId, storageVersion, pageSize });
  } else {
    const lastSync = await getLastSync({ storageId, storageVersion });
    if (!lastSync || lastSync < Date.now() - syncTimeoutMins * 60 * 1000) {
      await syncRows({
        ajaxId,
        storageId,
        storageVersion,
        apex,
        pageSize,
        online,
      });
    } else {
      apex.debug.info(
        `Skip sync for ${storageId} v${storageVersion} as it was synced in the last ${syncTimeoutMins} minutes: ${lastSync} (${new Date(
          lastSync,
        ).toLocaleString()})`,
      );
    }
  }

  setStorageReady({ storageId, storageVersion, apex });
}

function _getStorageKey({ storageId, storageVersion }: StorageInfo) {
  return `${storageId}_v${storageVersion}`;
}

function _storageIsReady({ storageId, storageVersion }: StorageInfo) {
  const storageKey = _getStorageKey({ storageId, storageVersion });

  if (
    !window?.hartenfeller_dev?.plugins?.sync_offline_data.dbStauts ||
    window.hartenfeller_dev.plugins.sync_offline_data.dbStauts !==
      DbStatus.Initialized
  ) {
    return { msg: "Plugin 'sync_offline_data' not ready!", ok: false };
  }

  if (!window.hartenfeller_dev.plugins.sync_offline_data.storages[storageKey]) {
    return { msg: `Storage '${storageKey}' not found!`, ok: false };
  }

  return { ok: true };
}

const storageCallbacks: { [key: string]: (() => void)[] } = {};

/**
 * Pass a callback function that gets called when the storage is ready (sync done or data initially loaded).
 * Use "waitTillStorageReady" if you want an async function.
 */
function _addStorageReadyCb({
  storageId,
  storageVersion,
  cb,
}: StorageInfo & {
  cb: () => void;
}) {
  const storageKey = _getStorageKey({ storageId, storageVersion });
  apex.debug.trace(`addStorageReadyCb: ${storageKey}`);

  if (
    window.hartenfeller_dev.plugins.sync_offline_data?.storages?.[storageKey]
      ?.isReady
  ) {
    cb();
  } else {
    if (storageCallbacks[storageKey]) {
      storageCallbacks[storageKey].push(cb);
    }
    storageCallbacks[storageKey] = [cb];
  }
}

/**
 * Returns a promise that resolves when the storage is ready (sync done or data initially loaded).
 */
function _waitTillStorageReady({ storageId, storageVersion }: StorageInfo) {
  return new Promise<void>((resolve) =>
    _addStorageReadyCb({ storageId, storageVersion, cb: resolve }),
  );
}

export function callStorageCallbacks({
  storageId,
  storageVersion,
}: StorageInfo) {
  const storageKey = _getStorageKey({ storageId, storageVersion });
  apex.debug.trace(
    `callStorageCallbacks: ${storageKey}`,
    storageCallbacks[storageKey],
  );

  window.hartenfeller_dev.plugins.sync_offline_data.storages[
    storageKey
  ].ready = true;

  if (storageCallbacks[storageKey]) {
    storageCallbacks[storageKey].forEach((cb) => cb());
    storageCallbacks[storageKey] = [];
  }
}

/**
 *
 * @param args
 * @param args.appId
 * @param args.pageId
 * @param args.regionId
 * @param args.dataKey
 * @param args.regionDataJson
 */
async function _mergeRegionData(args: MergeRegionDataMsgData) {
  const { data } = await sendMsgToWorker({
    storageId: '',
    storageVersion: 0,
    messageType: WorkerMessageType.MergeRegionData,
    data: args,
    expectedMessageType: WorkerMessageType.MergeRegionDataResponse,
  });
  return data;
}

/**
 *
 * @param args
 * @param args.appId
 * @param args.pageId
 * @param args.regionId
 * @param args.dataKey
 */
async function _getRegionData(args: GetRegionDataMsgData) {
  const { data } = await sendMsgToWorker({
    storageId: '',
    storageVersion: 0,
    messageType: WorkerMessageType.GetRegionData,
    data: args,
    expectedMessageType: WorkerMessageType.GetRegionDataResponse,
  });
  return data;
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

  window.hartenfeller_dev.plugins.sync_offline_data.constants = {
    COLNAME_CHANGE_TYPE: '__change_type',
  };

  window.hartenfeller_dev.plugins.sync_offline_data.storages = {};

  window.hartenfeller_dev.plugins.sync_offline_data.getStorageKey =
    _getStorageKey;

  window.hartenfeller_dev.plugins.sync_offline_data.storageIsReady =
    _storageIsReady;

  window.hartenfeller_dev.plugins.sync_offline_data.addStorageReadyCb =
    _addStorageReadyCb;

  window.hartenfeller_dev.plugins.sync_offline_data.waitTillStorageReady =
    _waitTillStorageReady;

  window.hartenfeller_dev.plugins.sync_offline_data.regionStorage = {
    mergeRegionData: _mergeRegionData,
    getRegionData: _getRegionData,
  };
}

(() => {
  setTimeout(() => {
    cachePage(window.apex);
  }, 1000 * 5);
})();
