function runPreChecks({ storageId, storageVersion, pkPageItem }) {
  if (!window.hartenfeller_dev?.plugins?.sync_offline_data) {
    apex.debug.error(
      'Plugin "Sync Offline Data" not found. Make sure it is loaded on page load.',
    );
    return { ok: false };
  }

  const storageKey =
    window.hartenfeller_dev.plugins.sync_offline_data.getStorageKey({
      storageId,
      storageVersion,
    });

  const pkVal = apex.item(pkPageItem)?.getValue();
  if (!pkVal) {
    apex.debug.error(`Page item '${pkPageItem}' not found or empty!`);
    return { ok: false };
  }

  const rdy = window.hartenfeller_dev.plugins.sync_offline_data.storageIsReady({
    storageId,
    storageVersion,
  });
  if (!rdy.ok) {
    apex.debug.error(rdy.msg);
    return { ok: false };
  }

  const pageId = apex.env.APP_PAGE_ID;

  return { ok: true, storageKey, pkVal, pageId };
}

async function _fillForm({ storageId, storageVersion, pkPageItem }) {
  const { ok, storageKey, pkVal, pageId } = runPreChecks({
    storageId,
    storageVersion,
    pkPageItem,
  });
  if (!ok) {
    return;
  }

  const promises = [
    window.hartenfeller_dev.plugins.sync_offline_data.storages[
      storageKey
    ].getColInfo(),

    window.hartenfeller_dev.plugins.sync_offline_data.storages[
      storageKey
    ].getRowByPk(pkVal),
  ];

  const [colInfo, row] = await Promise.all(promises);
  console.log({ colInfo, row, pageId });

  for (const col of colInfo.cols) {
    const itemName = `P${pageId}_${col.colname}`;
    const pageItem = apex.items[itemName];
    if (!pageItem) {
      apex.debug.trace(`Page item '${itemName}' not found!`);
    } else {
      apex.debug.trace(`Set value of ${itemName}: ${row[col.colname]}`);
      pageItem.setValue(row[col.colname]);
    }
  }
}

async function _save({ storageId, storageVersion, pkPageItem }) {
  const { ok, storageKey, pageId } = runPreChecks({
    storageId,
    storageVersion,
    pkPageItem,
  });
  if (!ok) {
    return;
  }

  const colInfo =
    await window.hartenfeller_dev.plugins.sync_offline_data.storages[
      storageKey
    ].getColInfo();

  const row = {};

  for (const col of colInfo.cols) {
    const itemName = `P${pageId}_${col.colname}`;
    const pageItem = apex.items[itemName];
    if (!pageItem) {
      apex.debug.trace(`Page item '${itemName}' not found!`);
    } else {
      row[col.colname] = pageItem.getValue();
    }
  }

  row[
    window.hartenfeller_dev.plugins.sync_offline_data.constants.COLNAME_CHANGE_TYPE
  ] = 'U';

  apex.debug.trace(`Saving row (${storageKey}):`, row);

  await window.hartenfeller_dev.plugins.sync_offline_data.storages[
    storageKey
  ].writeChanges([row]);
}

async function _run({
  action,
  storageId,
  storageVersion,
  pkPageItem,
  regionId,
}) {
  apex.debug.info(`offline_form_utils: Running action '${action}'...`, {
    storageId,
    storageVersion,
    pkPageItem,
    regionId,
  });

  switch (action) {
    case 'FILL':
      await _fillForm({ storageId, storageVersion, pkPageItem });
      break;
    case 'SAVE':
      await _save({ storageId, storageVersion, pkPageItem });
      break;

    default:
      apex.debug.error(`Unknown action: ${action}`);
  }
}

window.hartenfeller_dev = window.hartenfeller_dev || {};
window.hartenfeller_dev.plugins = window.hartenfeller_dev.plugins || {};
window.hartenfeller_dev.plugins.offline_form_utils =
  window.hartenfeller_dev.plugins.offline_form_utils || {};
window.hartenfeller_dev.plugins.offline_form_utils.run = _run;
