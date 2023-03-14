export type Datatype = 'real' | 'text';

export type Colinfo = {
  colname: string;
  datatype: Datatype;
  datatypeLength?: number;
  isRequired: boolean;
};

export type ColStructure = {
  cols: Colinfo[];
  lastChangedCol: string;
  pkCol: string;
};

export type DbRow = { [key: string]: number | string | undefined | null };

export type OrderByDir = 'asc' | 'desc';
