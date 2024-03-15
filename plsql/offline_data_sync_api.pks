create or replace package offline_data_sync_api as

  function num_to_date (
		pi_number in number
	) return date;

  procedure sync_row (
    pi_json_str             in offline_data_sync.sync_data_json%type
  , pi_sync_storage_id      in offline_data_sync.sync_storage_id%type
  , pi_sync_storage_version in offline_data_sync.sync_storage_version%type
  , po_succes               out nocopy boolean
  , po_sync_fail_reason     out nocopy offline_data_sync.sync_fail_reason%type
  , po_sync_device_pk       out nocopy offline_data_sync.sync_device_pk%type
  , po_snyc_db_pk           out nocopy offline_data_sync.sync_db_pk%type
  );

end offline_data_sync_api;
/
