const _initAPEXRegion = ({
  regionId,
  pageSize,
  headerFc,
  storageId,
  storageVersion,
  valuePageItem,
}) => {
  const region = `#${regionId}`;
  const wrapper = document.querySelector(`${region}_wrapper`);

  if (!pageSize || typeof pageSize !== 'number' || pageSize < 1) {
    apex.debug.warn(`Invalid page size: ${pageSize}. Defaulting to 15.`);
    pageSize = 15;
  }

  const el = document.createElement('p-offline-data-list');
  el.id = `${regionId}_webcomponent`;
  el.regionId = regionId;
  el.pageSize = pageSize;
  el.headerFc = headerFc;
  el.storageId = storageId;
  el.storageVersion = storageVersion;
  el.valuePageItem = valuePageItem;

  wrapper.appendChild(el);

  if (!window.apex) return;

  apex.region.create(regionId, {});
};

window.hartenfeller_dev = window.hartenfeller_dev || {};
window.hartenfeller_dev.plugins = window.hartenfeller_dev.plugins || {};
window.hartenfeller_dev.plugins.offline_data_list =
  window.hartenfeller_dev.plugins.offline_data_list || {};
window.hartenfeller_dev.plugins.offline_data_list.initAPEXRegion =
  _initAPEXRegion;
