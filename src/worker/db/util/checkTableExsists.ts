import { log } from '../../util/logger';
import { db, sqlite3 } from '../initDb';
import { rowToObject } from './rowToObject';

export default async function checkTableExists(tabname: string) {
  const sql = `select count(*) as cnt from sqlite_master where type = 'table' and lower(name) = '${tabname.toLocaleLowerCase()}'`;
  log.trace('checkTableExists sql:', sql);

  let result: boolean;

  await sqlite3.exec(db, sql, (row: any, columns: any) => {
    const data = rowToObject(row, columns);
    result = (data.cnt as number) > 0;
    log.trace('checkTableExists result:', data.cnt);
  });

  return result;
}
