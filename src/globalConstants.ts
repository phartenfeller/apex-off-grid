import { Colinfo } from './worker/db/types';

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
}

export type WorkerMessageParams = {
  messageId: string;
  messageType: WorkerMessageType;
  data?: any;
};

export type InitDbMsgData = {
  ok: boolean;
  error?: string;
};

export type InitDbPayloadData = {
  loglevel: number;
  filePrefix: string;
};

export type InitSourceMsgData = {
  storageId: string;
  storageVersion: number;
  colData: Colinfo[];
  pkColname: string;
  lastChangedColname: string;
};

export type InitSourceResponse = {
  ok: boolean;
  error?: string;
  isEmpty?: boolean;
};

export type InsertRowsMsgData = {
  storageId: string;
  storageVersion: number;
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

export enum DbStatus {
  NotInitialized = 'not_initialized',
  Initialized = 'initialized',
  Error = 'error',
  Initializing = 'initializing...',
}
