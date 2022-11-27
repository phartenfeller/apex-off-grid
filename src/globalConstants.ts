import { Colinfo } from './worker/db/types';

export enum WorkerMessageType {
  Loaded = 'loaded',
  InitDb = 'init_db',
  InitDbResult = 'init_db_result',
  InitSource = 'init_source',
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
};

export type InitSourceMsgData = {
  storageId: string;
  storageVersion: number;
  colData: Colinfo[];
};

export enum DbStatus {
  NotInitialized = 'not_initialized',
  Initialized = 'initialized',
  Error = 'error',
  Initializing = 'initializing...',
}
