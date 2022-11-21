import * as SQLite from 'wa-sqlite';
import SQLiteModuleFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import { OriginPrivateFileSystemVFS } from '../src/PrivateFileSystemVFS.js';

console.log('worker loaded');

const DB_NAME = 'file:///benchmark?foo=bar';
const TESTS = [
  test1,
  test2,
  test3,
  test4,
  test5,
  test6,
  test7,
  test8,
  test9,
  test10,
  test11,
  test12,
  test13,
  test14,
  test15,
  test16,
];

let sqlite3;
let db;
(async function () {
  const mod = await SQLiteModuleFactory();
  sqlite3 = SQLite.Factory(mod);
  // @ts-ignore
  sqlite3.vfs_register(new OriginPrivateFileSystemVFS(), true);

  addEventListener('message', async function ({ data }) {
    let result;
    switch (data?.f) {
      case 'initialize': {
        result = await initialize(data.preamble);
        break;
      }
      case 'create_table': {
        const start = Date.now();
        await createTable(sqlite3, db);
        result = Date.now() - start;
        break;
      }
      case 'query_data': {
        const start = Date.now();
        const data = await queryTable(sqlite3, db);
        console.log('data', data);
        result = Date.now() - start;
        break;
      }
      case 'persist': {
        persist();
        break;
      }
      case 'test': {
        const start = Date.now();
        await TESTS[data.i](sqlite3, db);
        result = Date.now() - start;
        break;
      }
      case 'finalize': {
        result = await finalize();
        break;
      }
      default:
        console.error(`unrecognized request '${data?.f}'`);
    }
    postMessage(result);
  });
  postMessage(null);
})();

async function initialize(preamble) {
  await clearFilesystem();

  db = await sqlite3.open_v2(
    DB_NAME,
    SQLite.SQLITE_OPEN_CREATE |
      SQLite.SQLITE_OPEN_READWRITE |
      SQLite.SQLITE_OPEN_URI,
    'opfs',
  );
  await sqlite3.exec(db, preamble);
}

async function finalize() {
  await sqlite3.close(db);
  await clearFilesystem();
}

async function clearFilesystem() {
  const rootDir = await navigator.storage.getDirectory();
  // @ts-ignore
  for await (const [name] of rootDir.entries()) {
    console.debug(`removing ${name}`);
    await rootDir.removeEntry(name, { recursive: true }).catch(() => {});
  }
}

async function createTable(sqlite3, db) {
  console.log('createTable');
  await sqlite3.exec(
    db,
    `
    BEGIN;
    CREATE TABLE t1(a INTEGER, b INTEGER, c VARCHAR(100));
  `,
  );
  for (let i = 0; i < 1000; ++i) {
    const n = Math.floor(Math.random() * 100000);
    await sqlite3.exec(
      db,
      `
      INSERT INTO t1 VALUES(${i + 1}, ${n}, '${numberName(n)}');
    `,
    );
  }
  await sqlite3.exec(
    db,
    `
    COMMIT;
  `,
  );
}

function queryTable(sqlite3, db) {
  console.log('queryTable');
  let data = [];
  return new Promise((resolve, reject) => {
    try {
      sqlite3.exec(
        db,
        `
      select * from t1;
    `,
        (row) => {
          data.push(row);
        },
      );

      resolve(data);
    } catch (e) {
      reject(e);
    }
  });
}

// Test 1: 1000 INSERTs
async function test1(sqlite3, db) {
  console.log('test1');
  await sqlite3.exec(
    db,
    `
    CREATE TABLE my_table(a INTEGER, b INTEGER, c VARCHAR(100));
  `,
  );
  for (let i = 0; i < 1000; ++i) {
    const n = Math.floor(Math.random() * 100000);
    await sqlite3.exec(
      db,
      `
      INSERT INTO t1 VALUES(${i + 1}, ${n}, '${numberName(n)}');
    `,
    );
  }
}

async function persist() {
  console.log('saving...');
  await navigator.storage.persist();
  console.log('saved!');
}

// Test 2: 25000 INSERTs in a transaction
async function test2(sqlite3, db) {
  await sqlite3.exec(
    db,
    `
    BEGIN;
    CREATE TABLE t2(a INTEGER, b INTEGER, c VARCHAR(100));
  `,
  );
  for (let i = 0; i < 25000; ++i) {
    const n = Math.floor(Math.random() * 100000);
    await sqlite3.exec(
      db,
      `
      INSERT INTO t2 VALUES(${i + 1}, ${n}, '${numberName(n)}');
    `,
    );
  }
  await sqlite3.exec(
    db,
    `
    COMMIT;
  `,
  );
}

// Test 3: 25000 INSERTs into an indexed table
async function test3(sqlite3, db) {
  await sqlite3.exec(
    db,
    `
    BEGIN;
    CREATE TABLE t3(a INTEGER, b INTEGER, c VARCHAR(100));
    CREATE INDEX i3 ON t3(c);
  `,
  );
  for (let i = 0; i < 25000; ++i) {
    const n = Math.floor(Math.random() * 100000);
    await sqlite3.exec(
      db,
      `
      INSERT INTO t3 VALUES(${i + 1}, ${n}, '${numberName(n)}');
    `,
    );
  }
  await sqlite3.exec(
    db,
    `
    COMMIT;
  `,
  );
}

// Test 4: 100 SELECTs without an index
async function test4(sqlite3, db) {
  await sqlite3.exec(
    db,
    `
    BEGIN;
  `,
  );
  for (let i = 0; i < 100; ++i) {
    await sqlite3.exec(
      db,
      `
      SELECT count(*), avg(b) FROM t2 WHERE b>=${i * 100} AND b<${
        i * 100 + 1000
      };
    `,
    );
  }
  await sqlite3.exec(
    db,
    `
    COMMIT;
  `,
  );
}

// Test 5: 100 SELECTs on a string comparison
async function test5(sqlite3, db) {
  await sqlite3.exec(
    db,
    `
    BEGIN;
  `,
  );
  for (let i = 0; i < 100; ++i) {
    await sqlite3.exec(
      db,
      `
    SELECT count(*), avg(b) FROM t2 WHERE c LIKE '%${numberName(i + 1)}%';
    `,
    );
  }
  await sqlite3.exec(
    db,
    `
    COMMIT;
  `,
  );
}

// Test 6: Creating an index
async function test6(sqlite3, db) {
  await sqlite3.exec(
    db,
    `
    CREATE INDEX i2a ON t2(a);
    CREATE INDEX i2b ON t2(b);
  `,
  );
}

// Test 7: 5000 SELECTs with an index
async function test7(sqlite3, db) {
  await sqlite3.exec(
    db,
    `
    BEGIN;
  `,
  );
  for (let i = 0; i < 5000; ++i) {
    await sqlite3.exec(
      db,
      `
      SELECT count(*), avg(b) FROM t2 WHERE b>=${i * 100} AND b<${i * 100 + 100};
    `,
    );
  }
  await sqlite3.exec(
    db,
    `
    COMMIT;
  `,
  );
}

// Test 8: 1000 UPDATEs without an index
async function test8(sqlite3, db) {
  await sqlite3.exec(
    db,
    `
    BEGIN;
  `,
  );
  for (let i = 0; i < 1000; ++i) {
    await sqlite3.exec(
      db,
      `
      UPDATE t1 SET b=b*2 WHERE a>=${i * 10} AND a<${i * 10 + 10};
    `,
    );
  }
  await sqlite3.exec(
    db,
    `
    COMMIT;
  `,
  );
}

// Test 9: 25000 UPDATEs with an index
async function test9(sqlite3, db) {
  await sqlite3.exec(
    db,
    `
    BEGIN;
  `,
  );
  for (let i = 0; i < 25000; ++i) {
    const n = Math.floor(Math.random() * 100000);
    await sqlite3.exec(
      db,
      `
      UPDATE t2 SET b=${n} WHERE a=${i + 1};
    `,
    );
  }
  await sqlite3.exec(
    db,
    `
    COMMIT;
  `,
  );
}

// Test 10: 25000 text UPDATEs with an index
async function test10(sqlite3, db) {
  await sqlite3.exec(
    db,
    `
    BEGIN;
  `,
  );
  for (let i = 0; i < 25000; ++i) {
    const n = Math.floor(Math.random() * 100000);
    await sqlite3.exec(
      db,
      `
      UPDATE t2 SET c='${numberName(n)}' WHERE a=${i + 1};
    `,
    );
  }
  await sqlite3.exec(
    db,
    `
    COMMIT;
  `,
  );
}

// Test 11: INSERTs from a SELECT
async function test11(sqlite3, db) {
  await sqlite3.exec(
    db,
    `
    BEGIN;
    INSERT INTO t1 SELECT b,a,c FROM t2;
    INSERT INTO t2 SELECT b,a,c FROM t1;
    COMMIT;
  `,
  );
}

// Test 12: DELETE without an index
async function test12(sqlite3, db) {
  await sqlite3.exec(
    db,
    `
    DELETE FROM t2 WHERE c LIKE '%fifty%';
  `,
  );
}

// Test 13: DELETE with an index
async function test13(sqlite3, db) {
  await sqlite3.exec(
    db,
    `
    DELETE FROM t2 WHERE a>10 AND a<20000;
  `,
  );
}

// Test 14: A big INSERT after a big DELETE
async function test14(sqlite3, db) {
  await sqlite3.exec(
    db,
    `
    INSERT INTO t2 SELECT * FROM t1;
  `,
  );
}

// Test 15: A big DELETE followed by many small INSERTs
async function test15(sqlite3, db) {
  await sqlite3.exec(
    db,
    `
    BEGIN;
    DELETE FROM t1;
  `,
  );
  for (let i = 0; i < 12000; ++i) {
    const n = Math.floor(Math.random() * 100000);
    await sqlite3.exec(
      db,
      `
      INSERT INTO t1 VALUES(${i + 1}, ${n}, '${numberName(n)}');
    `,
    );
  }
  await sqlite3.exec(
    db,
    `
    COMMIT;
  `,
  );
}

// Test 16: DROP TABLE
async function test16(sqlite3, db) {
  await sqlite3.exec(
    db,
    `
    DROP TABLE t1;
    DROP TABLE t2;
    DROP TABLE t3;
  `,
  );
}

const digits = [
  '',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
];
const names100 = [
  ...digits,
  ...[
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen',
  ],
  ...digits.map((digit) => `twenty${digit && `-${digit}`}`),
  ...digits.map((digit) => `thirty${digit && `-${digit}`}`),
  ...digits.map((digit) => `forty${digit && `-${digit}`}`),
  ...digits.map((digit) => `fifty${digit && `-${digit}`}`),
  ...digits.map((digit) => `sixty${digit && `-${digit}`}`),
  ...digits.map((digit) => `seventy${digit && `-${digit}`}`),
  ...digits.map((digit) => `eighty${digit && `-${digit}`}`),
  ...digits.map((digit) => `ninety${digit && `-${digit}`}`),
];
function numberName(n) {
  if (n === 0) {
    return 'zero';
  }

  const name = [];
  const d43 = Math.floor(n / 1000);
  if (d43) {
    name.push(names100[d43]);
    name.push('thousand');
    n -= d43 * 1000;
  }

  const d2 = Math.floor(n / 100);
  if (d2) {
    name.push(names100[d2]);
    name.push('hundred');
    n -= d2 * 100;
  }

  const d10 = n;
  if (d10) {
    name.push(names100[d10]);
  }

  return name.join(' ');
}
