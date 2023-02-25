import { initDb } from './db/initDb';
import { initSource, initTables } from './db/userTables';
import {
  InitDbPayloadData,
  InitSourceMsgData,
  InsertRowsMsgData,
  WorkerMessageParams,
  WorkerMessageType,
} from '../globalConstants';
import { initLogLevel, log } from './util/logger';
import insertRows from './db/util/insertRows';

function sendMsgToMain({ messageType, data }: WorkerMessageParams) {
  postMessage({ messageType, data });
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

          result = { messageType: WorkerMessageType.InitDbResult, data: res };
          sendMsgToMain(result);
          break;
        }
        case WorkerMessageType.InitSource: {
          const messageData = data.data as InitSourceMsgData;

          const res = await initSource(messageData);

          result = {
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
            messageType: WorkerMessageType.InsertRowsResult,
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

  console.log('worker loaded');
  console.log('worker window', self.window);
  sendMsgToMain({ messageType: WorkerMessageType.Loaded });
})();
