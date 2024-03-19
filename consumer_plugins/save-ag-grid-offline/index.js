/* global apex */

let spinner;

function showSpinner({ apex, regionId }) {
  spinner = apex.util.showSpinner(apex.jQuery(`#${regionId}`));
}

function hideSpinner() {
  try {
    if (spinner) {
      spinner.remove();
      spinner = null;
    }
  } catch (err) {
    apex.debug.warn('Could not remove spinner', err);
  }
}

async function _saveGrid({ regionId }) {
  try {
    const { data, pkIds, storageKey } = apex.region(regionId).getSaveData();
    if (pkIds.length === 0) {
      return;
    } else if (!storageKey) {
      apex.debug.error('No storage key provided');
      throw new Error('No storage key provided');
    }

    showSpinner({ apex, regionId });

    const rows = Object.values(data).map((r) => {
      const row = {
        ...r,
      };
      row[
        window.hartenfeller_dev.plugins.sync_offline_data.constants.COLNAME_CHANGE_TYPE
      ] = r['__row_action'] === 'C' ? 'I' : r['__row_action'];

      return row;
    });

    const res =
      await window.hartenfeller_dev.plugins.sync_offline_data.storages[
        storageKey
      ].writeChanges(rows);

    apex.debug.info('Save AG Grid offline res =>', res);

    hideSpinner();
    apex.region(regionId).saveSuccess();
    apex.message.showPageSuccess('Changes saved!');
  } catch (err) {
    hideSpinner();
    apex.debug.error(
      `Error in AG Grid Plugin (#${regionId}): ${JSON.stringify(err)}`,
    );

    apex.message.showErrors({
      type: 'error',
      location: 'page',
      message: 'Unexpected error saving data',
    });
  }
}

if (!window.hartenfeller_dev) {
  window.hartenfeller_dev = {};
}
if (!window.hartenfeller_dev.plugins) {
  window.hartenfeller_dev.plugins = {};
}

window.hartenfeller_dev.plugins.ag_grid_offline_da = {
  saveGrid: _saveGrid,
};
