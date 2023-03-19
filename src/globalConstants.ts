import { Colinfo, ColStructure, DbRow, OrderByDir } from './worker/db/types';

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
  GetRowByPk = 'get_row_by_pk',
  GetRowByPkResponse = 'get_row_by_pk_response',
  GetRows = 'get_rows',
  GetRowsResponse = 'get_rows_response',
  GetRowCount = 'get_row_count',
  GetRowCountResponse = 'get_row_count_response',
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

export type GetRowByPkMsgData = BaseRequestData & {
  pk: string | number;
};

export type GetRowByPkResponse = {
  ok: boolean;
  error?: string;
  row?: DbRow;
};

export type GetRowsMsgData = BaseRequestData & {
  offset: number;
  maxRows?: number;
  orderByCol?: string;
  orderByDir?: OrderByDir;
  searchTerm?: string;
};

export type GetRowsResponse = {
  ok: boolean;
  error?: string;
  rows?: DbRow[];
};

export type GetRowCountMsgData = BaseRequestData;

export type GetRowCountResponse = {
  ok: boolean;
  error?: string;
  rowCount?: number;
};

export enum DbStatus {
  NotInitialized = 'not_initialized',
  Initialized = 'initialized',
  Error = 'error',
  Initializing = 'initializing...',
}
