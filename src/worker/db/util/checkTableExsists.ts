import { log } from '../../util/logger';
import { db } from '../initDb';

export default function checkTableExists(tabname: string) {
  const sql = `select count(*) as cnt from sqlite_master where type = 'table' and lower(name) = $tabname`;
  log.trace('checkTableExists sql:', sql);

  const data = db.selectObject(sql, { $tabname: tabname.toLocaleLowerCase() });
  const result = (data.cnt as number) > 0;
  log.trace('checkTableExists result:', data.cnt);

  return result;
}
