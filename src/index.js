import Worker from 'worker-loader!./opfs-worker.js';
import { ajax } from './apex/ajax.js';

const preamble = `-- Pre-run setup
PRAGMA journal_mode=delete;`;

const worker = new Worker();
worker.addEventListener(
  'message',
  function () {
    console.log('message received');
  },
  { once: true },
);

async function runBench() {
  for await (const result of benchmark()) {
    const res = `${result / 1000} s`;
    console.log('res', res);
  }
}

async function init({ ajaxId, storageId, storageVersion }) {
  apex.debug.info('init', { ajaxId, storageId, storageVersion });

  await request({
    f: 'initialize',
    preamble: preamble,
  });

  await ajax({ apex, ajaxId, method: 'source_structure' });
}

async function createTable() {
  await request({
    f: 'create_table',
  });
}

async function queryData() {
  await request({
    f: 'query_data',
  });
}

async function persist() {
  await request({
    f: 'persist',
  });
}

async function* benchmark() {
  await request({
    f: 'initialize',
    preamble: preamble,
  });

  for (let i = 0; i < 16; ++i) {
    const result = await request({ f: 'test', i });
    yield result;
  }

  await request({ f: 'finalize' });
}

function request(message) {
  worker.postMessage(message);
  return new Promise(function (resolve) {
    worker.addEventListener(
      'message',
      function ({ data }) {
        resolve(data);
      },
      { once: true },
    );
  });
}

if (!window.hartenfeller_dev) {
  window.hartenfeller_dev = {};
}
if (!window.hartenfeller_dev.plugins) {
  window.hartenfeller_dev.plugins = {};
}
if (!window.hartenfeller_dev.plugins.sync_offline_data) {
  window.hartenfeller_dev.plugins.sync_offline_data = {};
}
if (!window.hartenfeller_dev.plugins.sync_offline_data.sync) {
  window.hartenfeller_dev.plugins.sync_offline_data.init = init;
  window.hartenfeller_dev.plugins.sync_offline_data.createTable = createTable;
  window.hartenfeller_dev.plugins.sync_offline_data.queryData = queryData;
  window.hartenfeller_dev.plugins.sync_offline_data.persist = persist;

  window.hartenfeller_dev.plugins.sync_offline_data.sync = runBench;
}
