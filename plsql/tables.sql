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
  constraint offline_data_sync_pk primary key (sync_id),
  constraint offlline_data_data_json_ck check (sync_data_json is json),
  constraint offlline_data_import_failed_ck check (sync_import_failed in (0,1))
);

create index offline_data_sync_storage_idx on offline_data_sync (sync_storage_id, sync_storage_version);
