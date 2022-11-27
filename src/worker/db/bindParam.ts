import { log } from '../util/logger';
import { sqlite3 } from './initDb';

export async function bindParam(
  name: string,
  preparedStmt: number,
  index: number,
  value: any,
) {
  try {
    await sqlite3.bind(preparedStmt, index, value);
  } catch (e) {
    log.error(
      `Error binding parameter ${name} at index ${index} with value ${value}: ${e.message}`,
    );
    throw e;
  }
}
