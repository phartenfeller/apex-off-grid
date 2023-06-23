const _initAPEXRegion = ({
  regionId,
  storageId,
  storageVersion,
  colConfig,
}) => {
  console.log('initAPEXRegion', {
    regionId,
    storageId,
    storageVersion,
    colConfig,
  });
  const region = `#${regionId}`;
  const wrapper = document.querySelector(`${region}_wrapper`);

  const el = document.createElement('p-offline-table');
  el.id = `${regionId}_webcomponent`;
  el.regionId = regionId;
  el.pageSize = 25;
  el.storageId = storageId;
  el.storageVersion = storageVersion;
  el.colConfig = colConfig;

  wrapper.appendChild(el);

  if (!window.apex) return;

  apex.region.create(regionId, {});
};

window.hartenfeller_dev = window.hartenfeller_dev || {};
window.hartenfeller_dev.plugins = window.hartenfeller_dev.plugins || {};
window.hartenfeller_dev.plugins.offline_table =
  window.hartenfeller_dev.plugins.offline_table || {};
window.hartenfeller_dev.plugins.offline_table.initAPEXRegion = _initAPEXRegion;
