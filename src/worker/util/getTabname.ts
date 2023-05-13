import { StorageInfo } from '../../globalConstants';

export default function getTabname({ storageId, storageVersion }: StorageInfo) {
  if (!storageId) throw new Error('storageId is required');
  if (!storageVersion && storageVersion !== 0)
    throw new Error('storageVersion is required');
  return `${storageId}_v${storageVersion}`;
}
