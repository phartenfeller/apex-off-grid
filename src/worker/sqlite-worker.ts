import { initDb } from './db/initDb';
import { initSource, initTables } from './db/userTables';
import {
  CheckSyncRowsMsgData,
  InitDbPayloadData,
  InitSourceMsgData,
  InsertRowsMsgData,
  SyncServerRowsMsgData,
  WorkerMessageParams,
  WorkerMessageType,
} from '../globalConstants';
import { initLogLevel, log } from './util/logger';
import insertRows from './db/util/insertRows';
import validateSyncRows from './db/util/validateSyncRows';
import syncServerRows from './db/util/syncServerRows';

function sendMsgToMain(obj: WorkerMessageParams) {
  postMessage(obj);
}

(async function () {
  addEventListener(
    'message',
    async function ({ data }: { data: WorkerMessageParams }) {
      let result: WorkerMessageParams;
      switch (data.messageType) {
        case WorkerMessageType.InitDb: {
          const messageData = data.data as InitDbPayloadData;
          initLogLevel(messageData.loglevel);

          const url = self.location.href;
          const regex = /(http.*)\/r\/.*/gm;
          const urlPrefix = regex.exec(url)[1];
          const fullUrl = `${urlPrefix}/${messageData.filePrefix}sqlite3.js`;

          log.info('script src:', fullUrl);
          importScripts(fullUrl);

          const res = await initDb();

          if (res.ok) {
            await initTables();
          }

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.InitDbResult,
            data: res,
          };
          sendMsgToMain(result);
          break;
        }
        case WorkerMessageType.InitSource: {
          const messageData = data.data as InitSourceMsgData;

          const res = await initSource(messageData);

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.InitSourceResult,
            data: res,
          };
          sendMsgToMain(result);
          break;
        }
        case WorkerMessageType.InsertRows: {
          const { storageId, storageVersion, rows } =
            data.data as InsertRowsMsgData;

          const res = insertRows({ storageId, storageVersion, rows });

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.InsertRowsResult,
            data: res,
          };
          sendMsgToMain(result);

          break;
        }
        case WorkerMessageType.CheckSyncRows: {
          const { storageId, storageVersion, rows } =
            data.data as CheckSyncRowsMsgData;

          const res = validateSyncRows({ storageId, storageVersion, rows });

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.CheckSyncRowsResult,
            data: res,
          };
          sendMsgToMain(result);

          break;
        }
        case WorkerMessageType.SyncServerRows: {
          const { storageId, storageVersion, rows } =
            data.data as SyncServerRowsMsgData;

          const res = syncServerRows({ storageId, storageVersion, rows });

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.SyncServerRowsResult,
            data: res,
          };
          sendMsgToMain(result);

          break;
        }
        /*
      case 'create_table': {
        const start = Date.now();
        await createTable();
        result = Date.now() - start;
        break;
      }
      case 'query_data': {
        const start = Date.now();
        const data = await queryTable();
        console.log('data', data);
        result = Date.now() - start;
        break;
      }
      case 'persist': {
        persist();
        break;
      }
      case 'finalize': {
        result = await finalize();
        break;
      }
      */
        default:
          console.error(`unrecognized request: "${data?.messageType}"`);
      }
    },
  );

  sendMsgToMain({
    messageId: 'worker_loaded',
    messageType: WorkerMessageType.Loaded,
  });
})();
