// @ts-ignore
import Worker from 'worker-loader!./worker/opfs-worker.ts';
import { ajax } from './apex/ajax';
import {
  DbStatus,
  InitDbMsgData,
  InitDbPayloadData,
  InitSourceMsgData,
  WorkerMessageParams,
  WorkerMessageType,
} from './globalConstants';
import { Colinfo } from './worker/db/types';

declare global {
  interface Window {
    apex: any;
    hartenfeller_dev: any;
  }
}

const apex = window.apex;

const worker = new Worker();

function sendMsgToWorker({
  messageType,
  data,
}: WorkerMessageParams): Promise<WorkerMessageParams> {
  worker.postMessage({ messageType, data });
  return new Promise((resolve) => {
    worker.addEventListener(
      'message',
      ({ data }: { data: WorkerMessageParams }) => {
        apex.debug.info(
          `Message received from Worker: ${data.messageType}`,
          data.data,
        );

        resolve(data);
      },
      { once: true },
    );
  });
}

async function initDb() {
  if (
    window.hartenfeller_dev.plugins.sync_offline_data.dbStauts !==
    DbStatus.NotInitialized
  ) {
    // already initialized (maybe by another plugin instance)
    return;
  }
  window.hartenfeller_dev.plugins.sync_offline_data.dbStauts =
    DbStatus.Initializing;

  const initDbPayload: InitDbPayloadData = { loglevel: apex.debug.getLevel() };
  const { messageType, data } = await sendMsgToWorker({
    messageType: WorkerMessageType.InitDb,
    data: initDbPayload,
  });

  if (messageType !== WorkerMessageType.InitDbResult) {
    apex.debug.error(`Unexpected message type: ${messageType}`);
    return;
  }

  apex.debug.info('initDb result', data);
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
      initDb();
    } else {
      apex.debug.error(
        `Excpected message type ${WorkerMessageType.Loaded} but got: ${data.messageType}`,
      );
    }
  },
  { once: true },
);

let initRetries = 0;

async function initStorage({
  ajaxId,
  storageId,
  storageVersion,
}: { ajaxId: string; storageId: string; storageVersion: number }) {
  if (
    window.hartenfeller_dev.plugins.sync_offline_data.dbStauts !==
    DbStatus.Initialized
  ) {
    if (initRetries < 20) {
      initRetries++;
      setTimeout(
        () => initStorage({ ajaxId, storageId, storageVersion }),
        1000,
      );
    } else {
      apex.debug.error('Could not initialize DB. Message from:', {
        storageId,
        storageVersion,
      });
    }
    return;
  }

  apex.debug.info('initStorage', { ajaxId, storageId, storageVersion });

  const res = (await ajax({ apex, ajaxId, method: 'source_structure' })) as any;

  if (!res?.source_structure) {
    apex.debug.error('No source_structure in response', res);
    return;
  }

  const colData: Colinfo[] = res.source_structure;

  const payload: InitSourceMsgData = { storageId, storageVersion, colData };

  await sendMsgToWorker({
    messageType: WorkerMessageType.InitSource,
    data: payload,
  });
}

/*
async function createTable() {
  await request({
    f: 'create_table',
  });
}

async function queryData() {
  await request({
    f: 'query_data',
  });
}

async function persist() {
  await request({
    f: 'persist',
  });
}
*/

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
  window.hartenfeller_dev.plugins.sync_offline_data.initStorage = initStorage;
  /*
  window.hartenfeller_dev.plugins.sync_offline_data.createTable = createTable;
  window.hartenfeller_dev.plugins.sync_offline_data.queryData = queryData;
  window.hartenfeller_dev.plugins.sync_offline_data.persist = persist;
  */

  window.hartenfeller_dev.plugins.sync_offline_data.dbStauts =
    DbStatus.NotInitialized;
}
