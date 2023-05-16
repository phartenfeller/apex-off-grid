// Reference: https://sqlite.org/wasm/doc/trunk/api-oo1.md

declare module 'sqlite3oo1' {
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

  type boundable =
    | number
    | string
    | undefined
    | null
    | Uint8Array
    | Int8Array
    | ArrayBuffer;

  export class Statement {
    bind(values: boundable | any[] | object): Statement;
    bind(idx: string | number, value: boundable): Statement;

    clearBindings(): Statement;
    step(): boolean;
    stepReset(): Statement;

    finalize(): void;
  }

  export class DB {
    constructor(filename: string, mode: string);

    exec(sql: string, optionsObject?: execOptionsWOsql): DB | any[];
    exec(sql: string[], optionsObject?: execOptionsWOsql): DB | any[];
    exec(optionsObject: execOptions): DB | any[];

    selectObject(sql: string, bind?: bind): { [key: string]: any };
    // rome-ignore lint/suspicious/noRedeclare: <explanation>
    selectObjects(sql: string, bind?: bind): { [key: string]: any }[];

    transaction(callback: () => void): void;
    prepare(sql: string): Statement;
  }
}
