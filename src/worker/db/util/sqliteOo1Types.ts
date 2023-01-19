// Reference: https://sqlite.org/wasm/doc/trunk/api-oo1.md

declare namespace sqlite3oo1 {
  export type bind = any[] | { [key: string]: any };

  export type execOptions = {
    sql?: string | string[];
    bind?: bind;
    saveSql?: any[];
    returnValue?: 'this' | 'resultRows' | 'saveSql';
    callback?: (arr: any[]) => void;
    columnNames?: string[];
    resultRows?: any[];
  };

  export type execOptionsWOsql = Omit<execOptions, 'sql'>;

  export class DB {
    constructor(filename: string, mode: string);

    exec(sql: string, optionsObject?: execOptionsWOsql): DB | any[];
    exec(sql: string[], optionsObject?: execOptionsWOsql): DB | any[];
    exec(optionsObject: execOptions): DB | any[];

    selectObject(sql: string, bind?: bind): { [key: string]: any };
    selectObjects(sql: string, bind?: bind): { [key: string]: any }[];
  }
}
