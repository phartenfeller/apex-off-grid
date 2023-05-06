import { WorkerMessageParams, WorkerMessageType } from './globalConstants';
import randomId from './util/randomId';

export type WorkerMsgCb = (data: WorkerMessageParams) => any;
const cbMap = new Map<string, WorkerMsgCb>();

let apex: any;
let worker: Worker;

/**
 * Initialize event listener for messages from worker
 *
 */
export function initMsgBus(_worker: Worker, _apex: any) {
  worker = _worker;
  apex = _apex;

  worker.addEventListener(
    'message',
    ({ data }: { data: WorkerMessageParams }) => {
      apex.debug.info(
        `Message received from Worker: ${data.messageId} - ${data.messageType}`,
        data.data,
      );

      if (cbMap.has(data.messageId)) {
        const cb = cbMap.get(data.messageId);
        cbMap.delete(data.messageId);
        cb(data);
      } else {
        apex.debug.error(
          `Could not find callback for message type: ${data.messageId} - ${data.messageType}`,
        );
      }
    },
  );
}

function addCallback({
  messageId,
  cb,
}: {
  messageId: string;
  cb: WorkerMsgCb;
}) {
  cbMap.set(messageId, cb);
}

export function sendMsgToWorker({
  storageId,
  storageVersion,
  messageType,
  data,
  expectedMessageType,
}: {
  storageId: string;
  storageVersion: number;
  messageType: string;
  data: any;
  expectedMessageType?: WorkerMessageType;
}): Promise<WorkerMessageParams> {
  return new Promise((resolve, reject) => {
    const messageId = `${storageId}_v${storageVersion}-${randomId()}`;

    const cb = (data: WorkerMessageParams) => {
      if (expectedMessageType && data.messageType !== expectedMessageType) {
        const reason = `Excpected message type ${expectedMessageType} but got: ${data.messageType}. MessageId: ${messageId}`;
        apex.debug.error(reason);
        reject(reason);
      }

      resolve(data);
    };

    addCallback({
      messageId,
      cb,
    });

    apex.debug.trace('Sending message to worker', {
      messageId,
      messageType,
      data,
    });
    worker.postMessage({
      messageId,
      messageType,
      data: { storageId, storageVersion, ...data },
    });
  });
}
