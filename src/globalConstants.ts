export enum WorkerMessageType {
  Loaded = 'loaded',
  InitDb = 'init_db',
  InitDbResult = 'init_db_result',
}

export type WorkerMessageParams = {
  messageType: WorkerMessageType;
  data?: any;
};

export type InitDbMsgData = {
  ok: boolean;
  error?: string;
};

export enum DbStatus {
  NotInitialized = 'not_initialized',
  Initialized = 'initialized',
  Error = 'error',
  Initializing = 'initializing...',
}
