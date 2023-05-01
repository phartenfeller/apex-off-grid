import {
  GetRegionDataMsgData,
  GetRegionDataResponse,
  MergeRegionDataMsgData,
  MergeRegionDataResponse,
} from '../../globalConstants';
import { log } from '../util/logger';
import { db } from './initDb';
import checkTableExists from './util/checkTableExsists';

const REGION_STOARAGE_TABLE_VERSION = 1;
const REGION_STOARAGE_TABLE = `_region_storage_v${REGION_STOARAGE_TABLE_VERSION}`;

function checkRegionStorageTableExists() {
  return checkTableExists(REGION_STOARAGE_TABLE);
}

function createRegionStorageTable() {
  const sql = `CREATE TABLE ${REGION_STOARAGE_TABLE} (
    app_id INTEGER NOT NULL,
    page_id INTEGER NOT NULL,
    region_id TEXT NOT NULL,
    data_key TEXT NOT NULL,
    region_data_json TEXT NOT NULL,
    constraint pk_${REGION_STOARAGE_TABLE} primary key (app_id, page_id, region_id, data_key)
  ) strict;
  `;
  log.trace('createRegionStorageTable sql:', sql);

  db.exec(sql);
  log.info('created region storage table');
}

export function initRegionStorageTable() {
  const regionStorageTableExsits = checkRegionStorageTableExists();
  if (!regionStorageTableExsits) {
    createRegionStorageTable();
  }
}

export function mergeRegionData({
  appId,
  pageId,
  regionId,
  dataKey,
  regionDataJson,
}: MergeRegionDataMsgData): MergeRegionDataResponse {
  const sql = `INSERT INTO ${REGION_STOARAGE_TABLE} (
    app_id,
    page_id,
    region_id,
    data_key,
    region_data_json
  ) VALUES (
    $appId,
    $pageId,
    $regionId,
    $dataKey,
    $regionDataJson
  )
  on conflict (app_id, page_id, region_id, data_key) do update set
    region_data_json = excluded.region_data_json
  ;`;

  const bind = {
    $appId: appId,
    $pageId: pageId,
    $regionId: regionId,
    $dataKey: dataKey,
    $regionDataJson: JSON.stringify(regionDataJson),
  };

  log.trace('addServerIds sql:', sql, bind);

  try {
    db.exec(sql, { bind });
    return { ok: true };
  } catch (e) {
    log.error('mergeRegionData error:', e);
    return { ok: false, error: e.message };
  }
}

export function getRegionData({
  appId,
  pageId,
  regionId,
  dataKey,
}: GetRegionDataMsgData): GetRegionDataResponse {
  const sql = `SELECT region_data_json FROM ${REGION_STOARAGE_TABLE} WHERE
    app_id = $appId AND
    page_id = $pageId AND
    region_id = $regionId AND
    data_key = $dataKey
  ;`;

  const binds = {
    $appId: appId,
    $pageId: pageId,
    $regionId: regionId,
    $dataKey: dataKey,
  };

  log.trace('getRegionData sql:', sql, binds);

  try {
    const result = db.selectObject(sql, binds);
    return { data: JSON.parse(result.region_data_json) };
  } catch (e) {
    log.error('getRegionData error:', e, { appId, pageId, regionId, dataKey });
    return { data: {}, error: e.message };
  }
}
