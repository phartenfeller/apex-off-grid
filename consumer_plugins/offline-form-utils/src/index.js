async function _fillForm({ storageId, storageVersion, pkPageItem }) {
  if (!window.hartenfeller_dev?.plugins?.sync_offline_data) {
    apex.debug.error(
      'Plugin "Sync Offline Data" not found. Make sure it is loaded on page load.',
    );
    return;
  }

  const storageKey =
    window.hartenfeller_dev.plugins.sync_offline_data.getStorageKey({
      storageId,
      storageVersion,
    });

  console.log(
    'pkPageItem',
    pkPageItem,
    apex.item(pkPageItem),
    apex.item(pkPageItem)?.getValue(),
    apex.item(pkPageItem).getValue(),
  );
  const pkVal = apex.item(pkPageItem)?.getValue();
  if (!pkVal) {
    apex.debug.error(`Page item '${pkPageItem}' not found or empty!`);
    return;
  }

  const rdy = window.hartenfeller_dev.plugins.sync_offline_data.storageIsReady({
    storageId,
    storageVersion,
  });
  if (!rdy.ok) {
    apex.debug.error(rdy.msg);
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

  const pageId = apex.env.APP_PAGE_ID;

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

    default:
      apex.debug.error(`Unknown action: ${action}`);
  }
}

window.hartenfeller_dev = window.hartenfeller_dev || {};
window.hartenfeller_dev.plugins = window.hartenfeller_dev.plugins || {};
window.hartenfeller_dev.plugins.offline_form_utils =
  window.hartenfeller_dev.plugins.offline_form_utils || {};
window.hartenfeller_dev.plugins.offline_form_utils.run = _run;
