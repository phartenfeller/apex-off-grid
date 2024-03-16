import {
  AnyObject,
  Colinfo,
  ColStructure,
  DbRow,
  OrderByDir,
} from './worker/db/types';

export const YELLOW_CONSOLE = 'color: yellow';
export const CYAN_CONSOLE = 'color: cyan';

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
  RemoveStorage = 'remove_storage',
  RemoveStorageResult = 'remove_storage_result',
  GetColInfo = 'get_col_info',
  GetColInfoResponse = 'get_col_info_response',
  GetRowByPk = 'get_row_by_pk',
  GetRowByPkResponse = 'get_row_by_pk_response',
  GetRows = 'get_rows',
  GetRowsResponse = 'get_rows_response',
  GetRowCount = 'get_row_count',
  GetRowCountResponse = 'get_row_count_response',
  WriteChanges = 'write_changes',
  WriteChangesResponse = 'write_changes_response',
  GetLastSync = 'get_last_sync',
  GetLastSyncResult = 'get_last_sync_result',
  SyncDone = 'sync_done',
  SyncDoneResult = 'sync_done_result',
  GetLocalChanges = 'get_local_changes',
  GetLocalChangesResult = 'get_local_changes_result',
  DeleteLocalChanges = 'delete_local_changes',
  DeleteLocalChangesResult = 'delete_local_changes_result',
  MergeRegionData = 'merge_region_data',
  MergeRegionDataResponse = 'merge_region_data_response',
  GetRegionData = 'get_region_data',
  GetRegionDataResponse = 'get_region_data_response',
  DoesStorageExist = 'does_storage_exist',
  DoesStorageExistResponse = 'does_storage_exist_response',
}

export type WorkerMessageParams = {
  messageId: string;
  messageType: WorkerMessageType;
  data?: any;
};

export type StorageInfo = {
  storageId: string;
  storageVersion: number;
};

type BaseRequestData = StorageInfo;

export type InitDbMsgData = {
  ok: boolean;
  error?: string;
};

export type InitDbPayloadData = {
  loglevel: number;
  filePrefix: string;
};

export type InitSourceMsgData = BaseRequestData & {
  colData?: Colinfo[];
  pkColname?: string;
  lastChangedColname?: string;
};

export type InitSourceResponse = {
  ok: boolean;
  error?: string;
  isEmpty?: boolean;
};

export type InsertRowsMsgData = BaseRequestData & {
  rows: DbRow[];
};

export type InsertRowsResponse = {
  ok: boolean;
  error?: string;
};

export type CheckSyncRowsMsgData = InsertRowsMsgData & {
  syncId: string;
};

export type CheckSyncRowsResponse = {
  ok: boolean;
  error?: string;
  needsUpdateRows?: (string | number)[];
};

export type SyncServerRowsMsgData = BaseRequestData & {
  rows: DbRow[];
};

export type SyncServerRowsResponse = {
  ok: boolean;
  error?: string;
};

export type RemoveStorageMsgData = BaseRequestData;

export type RemoveStorageResponse = {
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

export type ColFilter = { colname: string; filter: string };

export type RowFilterArgs = {
  searchTerm?: string;
  colFilters?: ColFilter[];
  whereClause?: string;
};

export type GetRowsArgs = {
  offset?: number;
  maxRows?: number;
  orderByCol?: string;
  orderByDir?: OrderByDir;
  getRowCount?: boolean;
  whereClause?: string;
} & RowFilterArgs;

export type GetRowsMsgData = BaseRequestData &
  GetRowsArgs & {
    colStructure?: ColStructure;
  };

export type GetRowsResponse = {
  ok: boolean;
  error?: string;
  rows?: DbRow[];
  rowCount?: number;
};

export type GetRowCountMsgData = BaseRequestData & RowFilterArgs;

export type GetRowCountResponse = {
  ok: boolean;
  error?: string;
  rowCount?: number;
};

export type WriteChangesMsgData = BaseRequestData & {
  rows: DbRow[];
};

export type WriteChangesResponse = {
  ok: boolean;
  error?: string;
};

export type GetLastSyncMsgData = BaseRequestData;

export type GetLastSyncResponse = {
  ok: boolean;
  error?: string;
  lastSync?: number;
};

export type SyncDoneMsgData = BaseRequestData & {
  syncId: string;
};

export type SyncDoneResponse = {
  ok: boolean;
  error?: string;
};

export type GetLocalChangesMsgData = BaseRequestData;

export type GetLocalChangesResponse = {
  ok: boolean;
  error?: string;
  rows?: DbRow[];
};

export type DeleteLocalChangesMsgData = BaseRequestData;

export type DeleteLocalChangesResponse = {
  ok: boolean;
  error?: string;
};

export enum DbStatus {
  NotInitialized = 'not_initialized',
  Initialized = 'initialized',
  Error = 'error',
  Initializing = 'initializing...',
}

export type MergeRegionDataMsgData = BaseRequestData & {
  appId: number;
  pageId: number;
  regionId: string;
  dataKey: string;
  regionDataJson: AnyObject;
};

export type MergeRegionDataResponse = {
  ok: boolean;
  error?: string;
};

export type GetRegionDataMsgData = BaseRequestData & {
  appId: number;
  pageId: number;
  regionId: string;
  dataKey: string;
};

export type GetRegionDataResponse = {
  data: AnyObject;
  error?: string;
};

export type DoesStorageExistMsgData = BaseRequestData;

export type DoesStorageExistResponse = {
  exists: boolean;
};
