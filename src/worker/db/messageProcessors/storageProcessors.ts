import { GetColInfoResponse } from '../../../globalConstants';
import { log } from '../../util/logger';
import { getStorageColumns } from '../metaTable';

export function getColInfo(
  storageId: string,
  storageVersion: number,
): GetColInfoResponse {
  try {
    const colStructure = getStorageColumns(storageId, storageVersion);

    return {
      ok: true,
      colInfo: colStructure,
    };
  } catch (err) {
    const msg = `Error getting col info for ${storageId}_v${storageVersion}: ${err}`;
    log.error(msg);
    return {
      ok: false,
      error: msg,
    };
  }
}
