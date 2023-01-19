export type Datatype = 'real' | 'text';

export type Colinfo = {
  colname: string;
  datatype: Datatype;
  datatypeLength?: number;
  isRequired: boolean;
};
