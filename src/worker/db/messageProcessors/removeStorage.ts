import {
  RemoveStorageMsgData,
  RemoveStorageResponse,
} from '../../../globalConstants';
import getTabname from '../../util/getTabname';
import { log } from '../../util/logger';
import { removeMetaEntry } from '../metaTable';
import { removeUserTable } from '../userTables';
import checkTableExists from '../util/checkTableExsists';

export default function removeStorage(
  msgData: RemoveStorageMsgData,
): RemoveStorageResponse {
  const tabname = getTabname(msgData);
  try {
    const tabExists = checkTableExists(tabname);
    if (tabExists) {
      removeUserTable(msgData);
    }

    removeMetaEntry(msgData);
    return { ok: true };
  } catch (err) {
    log.error('removeStorage error:', err);
    return { ok: false, error: err.message };
  }
}
