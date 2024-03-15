create or replace package body offline_data_sync_api as

  --gc_scope_prefix constant varchar2(31) := lower($$plsql_unit) || '.';

  c_unix_epoch date := to_date('1970-01-01', 'YYYY-MM-DD');

  function get_change_date (
		pi_json in json_object_t
	) return date
	as
	begin
		return c_unix_epoch + NUMTODSINTERVAL( (pi_json.get_number('__change_ts') / 1000), 'SECOND' );
	end get_change_date;

	function get_change_type (
		pi_json in json_object_t
	) return varchar2
	as
	begin
		return pi_json.get_string('__change_type');
	end get_change_type;

	procedure remove_json_metadata (
		pi_json in out json_object_t
	)
	as
	begin
		pi_json.remove('__change_ts');
		pi_json.remove('__change_type');
	end remove_json_metadata;

	function num_to_date (
		pi_number in number
	) return date
	as
		l_date date;
	begin
		l_date := c_unix_epoch + NUMTODSINTERVAL( (pi_number / 1000), 'SECOND' );
		apex_debug.info( apex_string.format('num_to_date - Input: %0, output: %1', pi_number, to_char(l_date, 'YYYY-MM-DD HH24:MI:SS')) );
		return l_date;
	end num_to_date;


  procedure process_people_v1 (
    pi_row     in offline_data_sync%rowtype
  , po_suceess out nocopy boolean
  )
  as
    --l_scope  logger_logs.scope%type := gc_scope_prefix || 'process_people_v1';
    --l_params logger.tab_param;

    l_json json_object_t;
    l_change_type varchar2(100);
    l_change_date date;

    l_row offl_people%rowtype;
    l_db_row_last_changed offl_people.last_changed%type;
  begin
    --logger.append_param(l_params, 'sync_id', pi_row.sync_id);
    --logger.log('START', l_scope, null, l_params);


    l_json := json_object_t(pi_row.sync_data_json);
    --logger.log('l_json => ' || l_json.to_string, l_scope, null, l_params);

    l_change_type := l_json.get_string('__change_type');
    --logger.append_param(l_params, 'l_change_type', l_change_type);
    l_change_date := c_unix_epoch + NUMTODSINTERVAL( (l_json.get_number('__change_ts') / 1000), 'SECOND');
    --logger.append_param(l_params, 'l_change_date', l_change_date);

    l_row.id := l_json.get_number('ID');
    --logger.append_param(l_params, 'id', l_row.id);
    l_row.email := l_json.get_string('EMAIL');
    --logger.append_param(l_params, 'email', l_row.email);
    l_row.salary := l_json.get_number('SALARY');
    --logger.append_param(l_params, 'salary', l_row.salary);
    l_row.company := l_json.get_string('COMPANY');
    --logger.append_param(l_params, 'company', l_row.company);
    l_row.skillset := l_json.get_string('SKILLSET');
    --logger.append_param(l_params, 'skillset', l_row.skillset);
    l_row.first_name := l_json.get_string('FIRST_NAME');
    --logger.append_param(l_params, 'first_name', l_row.first_name);
    l_row.last_name := l_json.get_string('LAST_NAME');
    --logger.append_param(l_params, 'last_name', l_row.last_name);
    l_row.shirt_size := l_json.get_string('SHIRT_SIZE');
    --logger.append_param(l_params, 'shirt_size', l_row.shirt_size);
    --l_row.birthday := l_json.get_string('BIRTHDAY');
    l_row.last_changed := c_unix_epoch + NUMTODSINTERVAL( (l_json.get_number('LAST_CHANGED') / 1000), 'SECOND');
    --logger.append_param(l_params, 'last_changed', l_row.last_changed);


    case l_change_type
      when 'I' then

        select max(id) + 1
          into l_row.id
          from offl_people
        ;

         l_row.last_changed := l_change_date;

        insert into offl_people
          values l_row
        ;

        --logger.log('Inserted row with id => ' || l_row.id, l_scope, null, l_params);

      when 'U' then

        select last_changed
          into l_db_row_last_changed
          from offl_people
          where id = l_row.id
        ;

        --logger.log('l_db_row_last_changed => ' || to_char(l_db_row_last_changed, 'YYYY-MM-DD HH24:MI:SS'), l_scope, null, l_params);
        --logger.log('l_row.last_changed => ' || to_char(l_row.last_changed, 'YYYY-MM-DD HH24:MI:SS'), l_scope, null, l_params);

        if l_db_row_last_changed != l_row.last_changed then
          --logger.log_warn('update: last_changed mismatch => ' || to_char(l_db_row_last_changed, 'YYYY-MM-DD HH24:MI:SS') || ' != ' || to_char(l_row.last_changed, 'YYYY-MM-DD HH24:MI:SS'), l_scope, null, l_params);
          po_suceess := false;
          return;
        end if;
        
        l_row.last_changed := l_change_date;

        update offl_people
          set row = l_row
        where id = l_row.id
        ;

        --logger.log('Updated row with id => ' || l_row.id, l_scope, null, l_params);


      when 'D' then

        select last_changed
          into l_db_row_last_changed
          from offl_people
          where id = l_row.id
        ;

        if l_db_row_last_changed != l_row.last_changed then
          --logger.log_warn('delete: last_changed mismatch => ' || to_char(l_db_row_last_changed, 'YYYY-MM-DD HH24:MI:SS') || ' != ' || to_char(l_row.last_changed, 'YYYY-MM-DD HH24:MI:SS'), l_scope, null, l_params);
          po_suceess := false;
          return;
        end if;

        delete
          from offl_people
          where id = l_row.id
        ;
        
        --logger.log('Deleted row with id => ' || l_row.id, l_scope, null, l_params);
      else
        --logger.log_error('Unhandled change_type => ' || l_change_type, l_scope, null, l_params);
        po_suceess := false;
        return;
    end case;

    po_suceess := true;
    --logger.log('END', l_scope, null, l_params);
  exception
    when others then
      --logger.log_error('Unhandled Exception', l_scope, null, l_params);
      apex_debug.error('Error in process_people_v1 => ' || sqlerrm || ' | ' || dbms_utility.format_error_backtrace);
      po_suceess := false;
  end process_people_v1;

  procedure sync_row (
    pi_json_str             in offline_data_sync.sync_data_json%type
  , pi_sync_storage_id      in offline_data_sync.sync_storage_id%type
  , pi_sync_storage_version in offline_data_sync.sync_storage_version%type
  , po_succes               out nocopy boolean
  , po_sync_fail_reason     out nocopy offline_data_sync.sync_fail_reason%type
  , po_sync_device_pk       out nocopy offline_data_sync.sync_device_pk%type
  , po_snyc_db_pk           out nocopy offline_data_sync.sync_db_pk%type
  )
  as
    l_json				json_object_t;
		l_change_type varchar2(1);
		l_change_date date;
  begin
    po_succes := false;
		l_json := json_object_t.parse(pi_json_str);
		l_change_date := get_change_date(l_json);
		l_change_type := get_change_type(l_json);
		remove_json_metadata(l_json);

		apex_debug.info( apex_string.format('Processing %0 v%1...', pi_sync_storage_id, pi_sync_storage_version) );
		apex_debug.info( apex_string.format('Change Type: %0', l_change_type) );
		apex_debug.info( apex_string.format('Change Date: %0', to_char(l_change_date, 'YYYY-MM-DD HH24:MI:SS')) );
		apex_debug.info( apex_string.format('Data: %0', l_json.stringify) );


    case when pi_sync_storage_id = 'people' and pi_sync_storage_version = 1 then
      process_people_v1(pi_row, po_succes);
    else
      po_sync_fail_reason := apex_string.format('Unhandled storage: %0 v%1', pi_sync_storage_id, pi_sync_storage_version);
      return;
    end case;

  exception
    when others then
      -- do not raise, just insert snyc as failed
      po_sync_fail_reason := sqlerrm || ' | ' || dbms_utility.format_error_backtrace;
  end sync_row;

end offline_data_sync_api;
/
