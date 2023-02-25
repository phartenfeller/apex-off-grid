import { log } from '../../util/logger';
import { db } from '../initDb';

export default function checkTableEmpty(tabname: string) {
  const sql = `select count(*) as cnt from (
    select 1 from ${tabname} limit 1
  );`;
  log.trace('checkTableEmpty sql:', sql);

  const data = db.selectObject(sql);
  const result = (data.cnt as number) > 0;
  log.trace('checkTableEmpty result:', data.cnt);

  return !result;
}
