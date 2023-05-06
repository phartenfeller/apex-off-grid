function runPreChecks({ storageId, storageVersion, pkPageItem, checkEmpty }) {
  if (!window.hartenfeller_dev?.plugins?.sync_offline_data) {
    const msg =
      'Plugin "Sync Offline Data" not found. Make sure it is loaded on page load.';
    apex.debug.error(msg);
    throw new Error(msg);
  }

  const storageKey =
    window.hartenfeller_dev.plugins.sync_offline_data.getStorageKey({
      storageId,
      storageVersion,
    });

  const pkVal = apex.item(pkPageItem)?.getValue();
  if (checkEmpty) {
    if (!pkVal) {
      const msg = `Page item '${pkPageItem}' not found or empty!`;
      apex.debug.error(msg);
      throw new Error(msg);
    }
  }

  const rdy = window.hartenfeller_dev.plugins.sync_offline_data.storageIsReady({
    storageId,
    storageVersion,
  });
  if (!rdy.ok) {
    apex.debug.error(rdy.msg);
    throw new Error(rdy.msg);
  }

  const pageId = apex.env.APP_PAGE_ID;

  return { ok: true, storageKey, pkVal, pageId };
}

function showSuccessMessage(msg) {
  apex.message.showPageSuccess(msg);
  setTimeout(() => {
    $('#t_Alert_Success button[title="Close"]').click();
  }, 2000);
}

async function _fillForm({ storageId, storageVersion, pkPageItem }) {
  const { ok, storageKey, pkVal, pageId } = runPreChecks({
    storageId,
    storageVersion,
    pkPageItem,
    checkEmpty: true,
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

async function getRow({
  storageId,
  storageVersion,
  pkPageItem,
  checkEmpty = true,
}) {
  const { ok, storageKey, pageId } = runPreChecks({
    storageId,
    storageVersion,
    pkPageItem,
    checkEmpty,
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

  return { row, storageKey };
}

async function _create({ storageId, storageVersion, pkPageItem }) {
  const { row, storageKey } = await getRow({
    storageId,
    storageVersion,
    pkPageItem,
    checkEmpty: false,
  });
  row[
    window.hartenfeller_dev.plugins.sync_offline_data.constants.COLNAME_CHANGE_TYPE
  ] = 'I';

  apex.debug.trace(`Creating row (${storageKey}):`, row);

  await window.hartenfeller_dev.plugins.sync_offline_data.storages[
    storageKey
  ].writeChanges([row]);

  showSuccessMessage('Record created successfully!');
}

async function _update({ storageId, storageVersion, pkPageItem }) {
  const { row, storageKey } = await getRow({
    storageId,
    storageVersion,
    pkPageItem,
  });
  row[
    window.hartenfeller_dev.plugins.sync_offline_data.constants.COLNAME_CHANGE_TYPE
  ] = 'U';

  apex.debug.trace(`Saving row (${storageKey}):`, row);

  await window.hartenfeller_dev.plugins.sync_offline_data.storages[
    storageKey
  ].writeChanges([row]);

  showSuccessMessage('Record updated successfully!');
}

async function _delete({ storageId, storageVersion, pkPageItem }) {
  const { row, storageKey } = await getRow({
    storageId,
    storageVersion,
    pkPageItem,
  });
  row[
    window.hartenfeller_dev.plugins.sync_offline_data.constants.COLNAME_CHANGE_TYPE
  ] = 'D';

  apex.debug.trace(`Deleting row (${storageKey}):`, row);

  await window.hartenfeller_dev.plugins.sync_offline_data.storages[
    storageKey
  ].writeChanges([row]);

  showSuccessMessage('Record deleted successfully!');
}

async function _clear({ storageId, storageVersion, pkPageItem }) {
  const { storageKey, pageId } = runPreChecks({
    storageId,
    storageVersion,
    pkPageItem,
    checkEmpty: false,
  });

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
      row[col.colname] = pageItem.setValue('');
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
    case 'INSERT':
    case 'CREATE':
      await _create({ storageId, storageVersion, pkPageItem });
      break;
    case 'UPDATE':
    case 'SAVE':
      await _update({ storageId, storageVersion, pkPageItem });
      break;
    case 'DELETE':
      await _delete({ storageId, storageVersion, pkPageItem });
      break;
    case 'CLEAR':
      await _clear({ storageId, storageVersion, pkPageItem });
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
