create or replace package body plugin_hartenfeller_offline_first_pkg as 

  type t_sqlite_col_info is record (
    colname         varchar2(100)
  , datatype        varchar2(100)
  , datatype_length number
  , is_required     boolean
  );

  type tt_sqlite_col_info is table of t_sqlite_col_info index by pls_integer;


 function render_da( 
    p_dynamic_action apex_plugin.t_dynamic_action
  , p_plugin         apex_plugin.t_plugin
  )
    return apex_plugin.t_dynamic_action_render_result
  as
    l_return apex_plugin.t_dynamic_action_render_result;

    l_storage_id           p_dynamic_action.attribute_03%type := p_dynamic_action.attribute_03;
    l_storage_version      p_dynamic_action.attribute_02%type := p_dynamic_action.attribute_02;
    l_pk_colname           p_dynamic_action.attribute_04%type := p_dynamic_action.attribute_04;
    l_last_changed_colname p_dynamic_action.attribute_05%type := p_dynamic_action.attribute_05;
  begin
    if apex_application.g_debug then
        apex_plugin_util.debug_dynamic_action
          ( p_plugin         => p_plugin
          , p_dynamic_action => p_dynamic_action
          );
    end if;

    l_return.javascript_function := 'function() { setTimeout(() => window.hartenfeller_dev.plugins.sync_offline_data.initStorage({'|| 
                                  apex_javascript.add_attribute( p_name => 'ajaxId', p_value => apex_plugin.get_ajax_identifier ) ||
                                  apex_javascript.add_attribute( p_name => 'storageId', p_value => l_storage_id ) ||
                                  apex_javascript.add_attribute( p_name => 'storageVersion', p_value => l_storage_version ) ||
                                  apex_javascript.add_attribute( p_name => 'pkColname', p_value => l_pk_colname ) ||
                                  apex_javascript.add_attribute( p_name => 'lastChangedColname', p_value => l_last_changed_colname ) ||
                                  '}), 1000)  }';

    apex_debug.message('render');

    return l_return;
  end render_da;


  function get_sqlite_data_type (
    pi_datatype apex_exec.t_data_type
  )
    return varchar2
  as
  begin
    case pi_datatype
      when apex_exec.c_data_type_varchar2 then
        return 'text';
      when apex_exec.c_data_type_number then
        return 'number';
      else
        apex_debug.error( apex_string.format('Unknown datatype => %0', pi_datatype ) );
        return 'text';
    end case;
  end get_sqlite_data_type;


  function get_source_structure(
    pi_sql_query in varchar2
  )
    return tt_sqlite_col_info
  as
    l_context           apex_exec.t_context;
    l_col_info          apex_exec.t_column;

    l_sqlite_col_info   t_sqlite_col_info;
    l_sqlite_col_info_t tt_sqlite_col_info := tt_sqlite_col_info();
  begin
      l_context :=
        apex_exec.open_query_context
        (
          p_location  => apex_exec.c_location_local_db
        , p_sql_query => pi_sql_query
        , p_max_rows  => 0
        );

    for i in 1 .. apex_exec.get_column_count(l_context)
    loop
      l_col_info := apex_exec.get_column(l_context, i);

      l_sqlite_col_info.colname := l_col_info.name;
      l_sqlite_col_info.datatype := get_sqlite_data_type(l_col_info.data_type);
      l_sqlite_col_info.datatype_length := l_col_info.data_type_length;
      l_sqlite_col_info.is_required := l_col_info.is_required;

      l_sqlite_col_info_t(i) := l_sqlite_col_info;
    end loop;

    apex_exec.close(l_context);

    return l_sqlite_col_info_t;
  
  exception
    when others then
      apex_exec.close(l_context);
      raise;
  end get_source_structure;


  function ajax_da( 
    p_dynamic_action apex_plugin.t_dynamic_action
  , p_plugin         apex_plugin.t_plugin
  ) 
    return apex_plugin.t_dynamic_action_ajax_result
  as
    l_return apex_plugin.t_dynamic_action_ajax_result;

    l_source_query p_dynamic_action.attribute_01%type := p_dynamic_action.attribute_01;
    l_storage_id   p_dynamic_action.attribute_03%type := p_dynamic_action.attribute_03;

    l_method varchar2(100);
    l_sqlite_col_info_t tt_sqlite_col_info;
  begin
    if apex_application.g_debug then
      apex_plugin_util.debug_dynamic_action
      ( p_plugin         => p_plugin
      , p_dynamic_action => p_dynamic_action
      );
    end if;

    l_method := APEX_APPLICATION.g_x01;
    apex_debug.info( apex_string.format('Calling AJAX with method => %0', l_method ) );

    apex_json.open_object; -- {

    case l_method
      when 'source_structure' then
        l_sqlite_col_info_t := get_source_structure( l_source_query );

        apex_json.open_array('source_structure'); -- "source_structure": [

        for i in 1 .. l_sqlite_col_info_t.count
        loop
          apex_json.open_object; -- {
          apex_json.write('colname', l_sqlite_col_info_t(i).colname); -- "colname": "..."
          apex_json.write('datatype', l_sqlite_col_info_t(i).datatype); -- "datatype": "..."
          apex_json.write('datatypeLength', l_sqlite_col_info_t(i).datatype_length); -- "datatypeLength": "..."
          apex_json.write('isRequired', l_sqlite_col_info_t(i).is_required); -- "isRequired": "..."
          apex_json.close_object; -- }
        end loop;

        apex_json.close_array; -- ]
 
      else
        apex_debug.error( apex_string.format('Unknown method => %0', l_method ) );
    end case;

    apex_json.close_object; -- }

    return l_return;
  exception
    when others then
      apex_debug.error( apex_string.format('Error in Offline Sync Plugin (%0): %1', l_storage_id, sqlerrm) );

      apex_json.close_all;
      raise;
  end ajax_da;


end plugin_hartenfeller_offline_first_pkg;
/
