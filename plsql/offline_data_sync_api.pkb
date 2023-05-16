create or replace package body offline_data_sync_api as

  --gc_scope_prefix constant varchar2(31) := lower($$plsql_unit) || '.';

  c_unix_epoch date := to_date('1970-01-01', 'YYYY-MM-DD');

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
    pi_row in offline_data_sync%rowtype
  )
  as
    l_success boolean;

    --l_scope  logger_logs.scope%type := gc_scope_prefix || 'sync_row';
    --l_params logger.tab_param;
  begin
    --logger.append_param(l_params, 'sync_id', pi_row.sync_id);
    --logger.append_param(l_params, 'sync_storage_id', pi_row.sync_storage_id);
    --logger.append_param(l_params, 'sync_storage_version', pi_row.sync_storage_version);
    --logger.log('START', l_scope, null, l_params);
    
    case when pi_row.sync_storage_id = 'people' and pi_row.sync_storage_version = 1 then
      process_people_v1(pi_row, l_success);
    else
      raise_application_error(-20001, 'Unhandeled sync_storage_id or sync_storage_version => ' || pi_row.sync_storage_id || ' ' || pi_row.sync_storage_version);
      return;
    end case;

    --logger.log('l_success => ' || case when l_success then 'true' else 'false' end, l_scope, null, l_params);

    if not l_success then

      update offline_data_sync
         set sync_import_failed = 1
       where sync_id = pi_row.sync_id;

    else

      update offline_data_sync
         set sync_success_at = sysdate
       where sync_id = pi_row.sync_id;
    end if;

    --logger.log('END', l_scope, null, l_params);
  exception
    when others then
      --logger.log_error('Unhandled Exception', l_scope, null, l_params);
      raise;
  end sync_row;

end offline_data_sync_api;
/
