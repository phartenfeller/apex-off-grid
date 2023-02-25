import { Colinfo } from './worker/db/types';

export enum WorkerMessageType {
  Loaded = 'loaded',
  InitDb = 'init_db',
  InitDbResult = 'init_db_result',
  InitSource = 'init_source',
  InitSourceResult = 'init_source_result',
}

export type WorkerMessageParams = {
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
};

export enum DbStatus {
  NotInitialized = 'not_initialized',
  Initialized = 'initialized',
  Error = 'error',
  Initializing = 'initializing...',
}
