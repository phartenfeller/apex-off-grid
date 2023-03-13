import { Colinfo, ColStructure } from './worker/db/types';

export const YELLOW_CONSOLE = 'color: yellow';

export enum WorkerMessageType {
  Loaded = 'loaded',
  InitDb = 'init_db',
  InitDbResult = 'init_db_result',
  InitSource = 'init_source',
  InitSourceResult = 'init_source_result',
  InsertRows = 'insert_rows',
  InsertRowsResult = 'insert_rows_result',
  CheckSyncRows = 'check_sync_rows',
  CheckSyncRowsResult = 'check_sync_rows_result',
  SyncServerRows = 'sync_server_rows',
  SyncServerRowsResult = 'sync_server_rows_result',
  GetColInfo = 'get_col_info',
  GetColInfoResponse = 'get_col_info_response',
}

export type WorkerMessageParams = {
  messageId: string;
  messageType: WorkerMessageType;
  data?: any;
};

type BaseRequestData = {
  storageId: string;
  storageVersion: number;
};

export type InitDbMsgData = {
  ok: boolean;
  error?: string;
};

export type InitDbPayloadData = {
  loglevel: number;
  filePrefix: string;
};

export type InitSourceMsgData = BaseRequestData & {
  colData: Colinfo[];
  pkColname: string;
  lastChangedColname: string;
};

export type InitSourceResponse = {
  ok: boolean;
  error?: string;
  isEmpty?: boolean;
};

export type InsertRowsMsgData = BaseRequestData & {
  rows: any[];
};

export type InsertRowsResponse = {
  ok: boolean;
  error?: string;
};

export type CheckSyncRowsMsgData = InsertRowsMsgData;

export type CheckSyncRowsResponse = {
  ok: boolean;
  error?: string;
  needsUpdateRows?: (string | number)[];
};

export type SyncServerRowsMsgData = BaseRequestData & {
  rows: any[];
};

export type SyncServerRowsResponse = {
  ok: boolean;
  error?: string;
};

export type GetColInfoMsgData = BaseRequestData;

export type GetColInfoResponse = {
  ok: boolean;
  error?: string;
  colInfo?: ColStructure;
};

export enum DbStatus {
  NotInitialized = 'not_initialized',
  Initialized = 'initialized',
  Error = 'error',
  Initializing = 'initializing...',
}
