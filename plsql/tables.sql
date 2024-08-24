drop table aog_storage;
drop table aog_database;

create sequence aog_dtb_seq;

create table aog_database (
  dtb_id             integer default on null aog_dtb_seq.nextval not null
, dtb_name           varchar2(255 char) not null
, dtb_internal_name  varchar2(255 char) not null
, dtb_created_at     date default sysdate not null
, dtb_created_by     varchar2(255 char) not null
, constraint aog_dtb_pk primary key (dtb_id)
, constraint aog_dtb_uk1 unique (dtb_name)
, constraint aog_dtb_uk2 unique (dtb_internal_name)
, constraint aog_dtb_internal_name_ck check ( regexp_like(dtb_internal_name, '^[a-z0-9]+(-[a-z0-9]+)*$'))
);

create sequence aog_stg_seq;

create table aog_storage (
  stg_id             integer default on null aog_stg_seq.nextval not null
, stg_dtb_id         integer not null
, stg_name           varchar2(255 char) not null
, stg_version        integer default on null 1 not null
, stg_query          varchar2(4000 char)
, stg_handler_prc    varchar2(4000 char)
, stg_status         varchar2(255 char) default on null 'DEV' not null
, stg_pk_column      varchar2(255 char)
, stg_date_col       varchar2(255 char)
, stg_depends_on_stg integer
, stg_column_options clob
, stg_created_at     date default sysdate not null
, stg_created_by     varchar2(255 char) not null
, stg_modified_at    date default sysdate not null
, stg_modified_by    varchar2(255 char) not null
, constraint aog_stg_pk primary key (stg_id)
, constraint aog_stg_uk1 unique (stg_dtb_id, stg_name, stg_version)
, constraint aog_stg_status_ck check (stg_status in ('DEV', 'ACTIVE', 'DEPRECATED'))
, constraint aog_stg_column_options_ck check (stg_column_options is json)
, constraint aog_stg_dtb_fk foreign key (stg_dtb_id) references aog_database (dtb_id)
, constraint aog_stg_depends_on_stg_fk foreign key (stg_depends_on_stg) references aog_storage (stg_id)
);


create sequence offline_data_sync_seq;

create table offline_data_sync (
  sync_id              number(38,0) default on null offline_data_sync_seq.nextval not null,
  sync_storage_id      varchar2(255) not null,
  sync_storage_version number(38,0) not null,
  sync_data_json       clob not null,
  sync_created_at      date default sysdate not null,
  sync_created_by      varchar2(255) not null,
  sync_created_session number(14,0) not null,
  sync_import_failed   number(1,0) default on null 0 not null,
  sync_success_at      date,
  sync_fail_reason     clob,
  sync_device_pk       varchar2(4000),
  sync_db_pk           varchar2(4000),
  constraint offline_data_sync_pk primary key (sync_id),
  constraint offlline_data_data_json_ck check (sync_data_json is json),
  constraint offlline_data_import_failed_ck check (sync_import_failed in (0,1))
);

create index offline_data_sync_storage_idx on offline_data_sync (sync_storage_id, sync_storage_version);
create index offline_data_sync_failed_idx on offline_data_sync (sync_import_failed);
create index offline_data_sync_device_pk_idx on offline_data_sync (sync_device_pk);
