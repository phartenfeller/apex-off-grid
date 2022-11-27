export function rowToObject(row: SQLiteCompatibleType[], columns: string[]) {
  const obj: { [key: string]: unknown } = {};
  for (let i = 0; i < row.length; i++) {
    obj[columns[i]] = row[i];
  }
  return obj;
}
