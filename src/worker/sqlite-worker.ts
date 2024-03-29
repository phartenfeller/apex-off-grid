import {
  CheckSyncRowsMsgData,
  DeleteLocalChangesMsgData,
  DoesStorageExistMsgData,
  DoesStorageExistResponse,
  GetColInfoMsgData,
  GetLastSyncMsgData,
  GetLocalChangesMsgData,
  GetRegionDataMsgData,
  GetRowByPkMsgData,
  GetRowCountMsgData,
  GetRowsMsgData,
  InitDbPayloadData,
  InitSourceMsgData,
  InsertRowsMsgData,
  MergeRegionDataMsgData,
  SyncDoneMsgData,
  SyncServerRowsMsgData,
  WorkerMessageParams,
  WorkerMessageType,
  WriteChangesMsgData,
} from '../globalConstants';
import { initDb } from './db/initDb';
import removeStorage from './db/messageProcessors/removeStorage';
import {
  deleteLocalChanges,
  getColInfo,
  getLocalChanges,
  getRowByPk,
  getRowCount,
  getRows,
  syncDone,
  writeChanges,
} from './db/messageProcessors/storageProcessors';
import { getLastSync } from './db/metaTable';
import { getRegionData, mergeRegionData } from './db/regionStorageTable';
import { initSource, initTables } from './db/userTables';
import checkTableExists from './db/util/checkTableExsists';
import insertRows from './db/util/insertRows';
import syncServerRows from './db/util/syncServerRows';
import validateSyncRows from './db/util/validateSyncRows';
import getTabname from './util/getTabname';
import { initLogLevel, log } from './util/logger';

function sendMsgToMain(obj: WorkerMessageParams) {
  log.trace('Sending message to worker', {
    obj,
  });
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
          log.trace('initDb result in Worker', { res });

          if (res.ok) {
            initTables();
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
          const props = data.data as CheckSyncRowsMsgData;

          const res = validateSyncRows(props);

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
        case WorkerMessageType.RemoveStorage: {
          const res = removeStorage(data.data);

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.RemoveStorageResult,
            data: res,
          };
          sendMsgToMain(result);

          break;
        }
        case WorkerMessageType.GetColInfo: {
          const { storageId, storageVersion } = data.data as GetColInfoMsgData;
          const res = getColInfo(storageId, storageVersion);

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.GetColInfoResponse,
            data: res,
          };
          sendMsgToMain(result);

          break;
        }
        case WorkerMessageType.GetRowByPk: {
          const { storageId, storageVersion, pk } =
            data.data as GetRowByPkMsgData;
          const res = getRowByPk(storageId, storageVersion, pk);

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.GetRowByPkResponse,
            data: res,
          };
          sendMsgToMain(result);

          break;
        }
        case WorkerMessageType.GetRows: {
          const props = data.data as GetRowsMsgData;
          const res = getRows(props);

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.GetRowsResponse,
            data: res,
          };
          sendMsgToMain(result);

          break;
        }
        case WorkerMessageType.GetRowCount: {
          const props = data.data as GetRowCountMsgData;
          const res = getRowCount(props);

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.GetRowCountResponse,
            data: res,
          };
          sendMsgToMain(result);

          break;
        }
        case WorkerMessageType.WriteChanges: {
          const props = data.data as WriteChangesMsgData;
          const res = await writeChanges(props);

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.WriteChangesResponse,
            data: res,
          };
          sendMsgToMain(result);

          break;
        }

        case WorkerMessageType.GetLastSync: {
          const props = data.data as GetLastSyncMsgData;
          const res = getLastSync(props);

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.GetLastSyncResult,
            data: res,
          };
          sendMsgToMain(result);

          break;
        }

        case WorkerMessageType.SyncDone: {
          const props = data.data as SyncDoneMsgData;
          const res = syncDone(props);

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.SyncDoneResult,
            data: res,
          };
          sendMsgToMain(result);

          break;
        }

        case WorkerMessageType.GetLocalChanges: {
          const props = data.data as GetLocalChangesMsgData;
          const res = getLocalChanges(props);

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.GetLocalChangesResult,
            data: res,
          };
          sendMsgToMain(result);

          break;
        }

        case WorkerMessageType.DeleteLocalChanges: {
          const props = data.data as DeleteLocalChangesMsgData;
          const res = deleteLocalChanges(props);

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.DeleteLocalChangesResult,
            data: res,
          };
          sendMsgToMain(result);

          break;
        }

        case WorkerMessageType.MergeRegionData: {
          const props = data.data as MergeRegionDataMsgData;
          const res = mergeRegionData(props);

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.MergeRegionDataResponse,
            data: res,
          };

          sendMsgToMain(result);

          break;
        }

        case WorkerMessageType.GetRegionData: {
          const props = data.data as GetRegionDataMsgData;
          const res = getRegionData(props);

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.GetRegionDataResponse,
            data: res,
          };

          sendMsgToMain(result);

          break;
        }

        case WorkerMessageType.DoesStorageExist: {
          const props = data.data as DoesStorageExistMsgData;
          const tabname = getTabname(props);
          const res = checkTableExists(tabname);

          result = {
            messageId: data.messageId,
            messageType: WorkerMessageType.DoesStorageExistResponse,
            data: { exists: res } as DoesStorageExistResponse,
          };
          sendMsgToMain(result);

          break;
        }

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
