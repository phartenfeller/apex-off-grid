create or replace package offline_data_sync_api as

  procedure sync_row (
    pi_row in offline_data_sync%rowtype
  );

end offline_data_sync_api;
/
