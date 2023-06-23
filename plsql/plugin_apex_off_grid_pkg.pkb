create or replace package body plugin_apex_off_grid_pkg as 

  type t_sqlite_col_info is record (
    colname         varchar2(100)
  , datatype        varchar2(100)
  , datatype_length number
  , is_required     boolean
  );

  type tt_sqlite_col_info is table of t_sqlite_col_info index by pls_integer;

 type t_table_region_col_info is record (
    name                  APEX_APPLICATION_PAGE_REG_COLS.name%type
  , data_type             APEX_APPLICATION_PAGE_REG_COLS.data_type%type
  , is_visible            number(1,0)
  , heading               APEX_APPLICATION_PAGE_REG_COLS.heading%type
  , sortable              number(1,0)
  , filterable            number(1,0)
  );

  type tt_table_region_col_info is table of t_table_region_col_info;


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
    l_page_size            p_dynamic_action.attribute_06%type := p_dynamic_action.attribute_06;
    l_sync_timeout         p_dynamic_action.attribute_07%type := p_dynamic_action.attribute_07;
    l_mode                 p_dynamic_action.attribute_08%type := p_dynamic_action.attribute_08;
  begin
    if apex_application.g_debug then
        apex_plugin_util.debug_dynamic_action
          ( p_plugin         => p_plugin
          , p_dynamic_action => p_dynamic_action
          );
    end if;

    l_return.javascript_function := 'function() { ' ||
                                  'apex.debug.info("'|| apex_string.format('init offline-sync %0 (v%1)', l_storage_id, l_storage_version) ||'");' ||
                                  'window.hartenfeller_dev.plugins.sync_offline_data.setFilePrefix({' ||
                                    apex_javascript.add_attribute( p_name => 'filePrefix', p_value => p_plugin.file_prefix ) ||
                                  '});'||
                                  'setTimeout(() => window.hartenfeller_dev.plugins.sync_offline_data.initStorage({'|| 
                                  apex_javascript.add_attribute( p_name => 'ajaxId', p_value => apex_plugin.get_ajax_identifier ) ||
                                  apex_javascript.add_attribute( p_name => 'storageId', p_value => l_storage_id ) ||
                                  apex_javascript.add_attribute( p_name => 'storageVersion', p_value => l_storage_version ) ||
                                  apex_javascript.add_attribute( p_name => 'pkColname', p_value => l_pk_colname ) ||
                                  apex_javascript.add_attribute( p_name => 'lastChangedColname', p_value => l_last_changed_colname ) ||
                                  apex_javascript.add_attribute( p_name => 'pageSize', p_value => to_number(l_page_size) ) || 
                                  apex_javascript.add_attribute( p_name => 'syncTimeoutMins', p_value => to_number(l_sync_timeout) ) || 
                                  apex_javascript.add_attribute( p_name => 'mode', p_value => l_mode ) ||
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
        return 'real';

      when apex_exec.c_data_type_date then
        -- todo better date handling
        return 'text';
      
      else
        apex_debug.error( apex_string.format('Unhandeled datatype => %0', pi_datatype ) );
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

  function get_json_clob
    return clob
  as
    l_str_tab apex_t_varchar2 := apex_t_varchar2();
    l_clob    clob;
  begin
    for i in 1..apex_application.g_json.count loop
      l_str_tab.extend();
      l_str_tab(i) := apex_application.g_json(i);
      apex_debug.trace('json ('||i||'): '|| l_str_tab(i));
    end loop;
    l_clob := apex_string.join_clob( p_table => l_str_tab, p_sep => null );
    return l_clob;
  end get_json_clob;


  procedure get_server_changed_rows (
    pi_pk_colname           in varchar2
  , pi_source_query         in varchar2
  )
  as
    l_clob              clob;
    l_json              json_object_t;
    l_apex_json         apex_json.t_values;
    l_str_arr           apex_t_varchar2;
    l_context           apex_exec.t_context;
    l_filters           apex_exec.t_filters;
    l_col_info          apex_exec.t_column;
    l_col_info_exec_tab apex_exec.t_columns;
  begin
    l_clob := get_json_clob();
    apex_json.parse
      (
        p_values => l_apex_json
      , p_source => l_clob
      );

    l_clob    := apex_json.get_clob( p_values => l_apex_json, p_path => 'regions[1].data.ids' ); 
    l_str_arr := apex_string.split(l_clob, ':');
    apex_debug.trace('get_server_changed_rows array items: ' || l_str_arr.count);

    apex_exec.add_filter(
      p_filters     => l_filters,
      p_filter_type => apex_exec.c_filter_in,
      p_column_name => upper(pi_pk_colname),
      p_values      => l_str_arr
    );

    l_context :=
      apex_exec.open_query_context
      (
        p_location  => apex_exec.c_location_local_db
      , p_sql_query => pi_source_query
      , p_filters   => l_filters
      );

    apex_json.open_array('data'); -- "data": [

    for i in 1 .. apex_exec.get_column_count(l_context)
    loop
      l_col_info := apex_exec.get_column(l_context, i);
      l_col_info_exec_tab(i) := l_col_info;
    end loop;

    while apex_exec.next_row( p_context => l_context ) 
    loop
      apex_json.open_object; -- {

      for i in 1 .. l_col_info_exec_tab.count
      loop
        if l_col_info_exec_tab(i).data_type = apex_exec.c_data_type_number then
          apex_json.write(l_col_info_exec_tab(i).name, apex_exec.get_number( p_context => l_context, p_column_idx => i ) );
        else
          apex_json.write(l_col_info_exec_tab(i).name, apex_exec.get_varchar2( p_context => l_context, p_column_idx => i ) );
        end if;
      end loop;

      apex_json.close_object; -- }
    end loop;

    apex_json.close_array;
  end get_server_changed_rows;


  procedure process_client_changed_rows
  as
    l_clob              clob;
    l_json              json_object_t;
    l_regions_arr       json_array_t;
    l_region_data_obj   json_object_t;
    l_rows_arr          json_array_t;

    l_sync_template_row offline_data_sync%rowtype;
    l_sync_row          offline_data_sync%rowtype;
  begin
    l_clob := get_json_clob();
    l_json := json_object_t(l_clob);

    l_regions_arr := l_json.get_array('regions');
    l_region_data_obj := treat(l_regions_arr.get(0) as json_object_t).get_object('data');
    l_rows_arr := l_region_data_obj.get_array('rows');

    l_sync_template_row.sync_storage_id      := l_region_data_obj.get_string( 'storageId' );
    l_sync_template_row.sync_storage_version := l_region_data_obj.get_number( 'storageVersion' );
    l_sync_template_row.sync_created_at      := sysdate;
    l_sync_template_row.sync_created_by      := v('APP_USER');
    l_sync_template_row.sync_created_session := v('APP_SESSION');

    apex_debug.trace( 
      apex_string.format(
        'storage: %s v %s, created: %s session: %s',
        l_sync_template_row.sync_storage_id,
        l_sync_template_row.sync_storage_version,
        l_sync_template_row.sync_created_by,
        l_sync_template_row.sync_created_session
      )
    );
    apex_debug.trace('process_client_changed_rows: ' || l_rows_arr.get_size);

    for i in 0 .. l_rows_arr.get_size - 1 loop
      l_sync_row := l_sync_template_row;
      l_sync_row.sync_data_json := TREAT(l_rows_arr.get(i) AS JSON_OBJECT_T).to_clob();

      insert into offline_data_sync values l_sync_row returning sync_id into l_sync_row.sync_id;

      offline_data_sync_api.sync_row(l_sync_row);
    end loop;

    apex_json.write('ok', true);
  exception
    when others then
      apex_debug.error('process_client_changed_rows: ' || sqlerrm || ' | ' || DBMS_UTILITY.FORMAT_ERROR_BACKTRACE );

      apex_json.write('ok', false);
      apex_json.write('error', sqlerrm);
  end process_client_changed_rows;


  function ajax_da( 
    p_dynamic_action apex_plugin.t_dynamic_action
  , p_plugin         apex_plugin.t_plugin
  ) 
    return apex_plugin.t_dynamic_action_ajax_result
  as
    l_return apex_plugin.t_dynamic_action_ajax_result;

    l_source_query         p_dynamic_action.attribute_01%type := p_dynamic_action.attribute_01;
    l_storage_id           p_dynamic_action.attribute_03%type := p_dynamic_action.attribute_03;
    l_pk_colname           p_dynamic_action.attribute_04%type := p_dynamic_action.attribute_04;
    l_last_changed_colname p_dynamic_action.attribute_05%type := p_dynamic_action.attribute_05;

    l_method varchar2(100);
    l_sqlite_col_info_t tt_sqlite_col_info;

    l_filters           apex_exec.t_filters;
    l_context           apex_exec.t_context;
    l_col_info          apex_exec.t_column;
    l_col_info_exec_tab apex_exec.t_columns;

    l_first_row pls_integer;
    l_max_rows  pls_integer;
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
 
      when 'fetch_data' then
        l_first_row := coalesce(APEX_APPLICATION.g_x02, 1);
        l_max_rows := coalesce(APEX_APPLICATION.g_x03, 50);

        l_context :=
          apex_exec.open_query_context
          (
            p_location  => apex_exec.c_location_local_db
          , p_sql_query => l_source_query
          , p_first_row => l_first_row
          , p_max_rows  => l_max_rows
          );

        apex_json.open_array('data'); -- "data": [

        for i in 1 .. apex_exec.get_column_count(l_context)
        loop
          l_col_info := apex_exec.get_column(l_context, i);
          l_col_info_exec_tab(i) := l_col_info;
        end loop;

        while apex_exec.next_row( p_context => l_context ) 
        loop
          apex_json.open_object; -- {

          for i in 1 .. l_col_info_exec_tab.count
          loop
            if l_col_info_exec_tab(i).data_type = apex_exec.c_data_type_number then
              apex_json.write(l_col_info_exec_tab(i).name, apex_exec.get_number( p_context => l_context, p_column_idx => i ) );
            else
              apex_json.write(l_col_info_exec_tab(i).name, apex_exec.get_varchar2( p_context => l_context, p_column_idx => i ) );
            end if;
          end loop;

          apex_json.close_object; -- }
        end loop;

        apex_json.close_array;

        apex_json.write('hasMoreRows', apex_exec.has_more_rows( l_context ));

      when 'sync_checksums' then
        l_first_row := coalesce(APEX_APPLICATION.g_x02, 1);
        l_max_rows := coalesce(APEX_APPLICATION.g_x03, 50);

        l_context :=
          apex_exec.open_query_context
          (
            p_location  => apex_exec.c_location_local_db
          , p_sql_query => l_source_query
          , p_first_row => l_first_row
          , p_max_rows  => l_max_rows
          );

        apex_json.open_array('data'); -- "data": [

        for i in 1 .. apex_exec.get_column_count(l_context)
        loop
          l_col_info := apex_exec.get_column(l_context, i);
          l_col_info_exec_tab(i) := l_col_info;
        end loop;

        while apex_exec.next_row( p_context => l_context ) 
        loop
          apex_json.open_object; -- {

          for i in 1 .. l_col_info_exec_tab.count
          loop
            if l_col_info_exec_tab(i).name not in (upper(l_pk_colname), upper(l_last_changed_colname)) then
              continue;
            end if;

            if l_col_info_exec_tab(i).data_type = apex_exec.c_data_type_number then
              apex_json.write(l_col_info_exec_tab(i).name, apex_exec.get_number( p_context => l_context, p_column_idx => i ) );
            else
              apex_json.write(l_col_info_exec_tab(i).name, apex_exec.get_varchar2( p_context => l_context, p_column_idx => i ) );
            end if;
          end loop;

          apex_json.close_object; -- }
        end loop;

        apex_json.close_array;

        apex_json.write('hasMoreRows', apex_exec.has_more_rows( l_context ));

      when 'get_server_changed_rows' then
        get_server_changed_rows(
          pi_pk_colname => l_pk_colname,
          pi_source_query => l_source_query
        );
        /*
        l_clob      := get_json_clob();
        l_str_arr   := apex_string.split(l_clob, ':');
        apex_debug.trace('get_server_changed_rows array items: ' || l_str_arr.count);

        apex_exec.add_filter(
          p_filters     => l_filters,
          p_filter_type => apex_exec.c_filter_in,
          p_column_name => upper(l_pk_colname),
          p_values      => l_str_arr
        );

        l_context :=
          apex_exec.open_query_context
          (
            p_location  => apex_exec.c_location_local_db
          , p_sql_query => l_source_query
          , p_filters   => l_filters
          );

        apex_json.open_array('data'); -- "data": [

        for i in 1 .. apex_exec.get_column_count(l_context)
        loop
          l_col_info := apex_exec.get_column(l_context, i);
          l_col_info_exec_tab(i) := l_col_info;
        end loop;

        while apex_exec.next_row( p_context => l_context ) 
        loop
          apex_json.open_object; -- {

          for i in 1 .. l_col_info_exec_tab.count
          loop
            if l_col_info_exec_tab(i).data_type = apex_exec.c_data_type_number then
              apex_json.write(l_col_info_exec_tab(i).name, apex_exec.get_number( p_context => l_context, p_column_idx => i ) );
            else
              apex_json.write(l_col_info_exec_tab(i).name, apex_exec.get_varchar2( p_context => l_context, p_column_idx => i ) );
            end if;
          end loop;

          apex_json.close_object; -- }
        end loop;

        apex_json.close_array;
        */

      when 'sync_client_changed_rows' then
        process_client_changed_rows();

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


  function render_ag_grid_offline_da( 
    p_dynamic_action apex_plugin.t_dynamic_action
  , p_plugin         apex_plugin.t_plugin
  )
    return apex_plugin.t_dynamic_action_render_result
  as
    l_return apex_plugin.t_dynamic_action_render_result;

    l_region_id varchar2(4000);
  begin
      if apex_application.g_debug then
          apex_plugin_util.debug_dynamic_action
            ( p_plugin         => p_plugin
            , p_dynamic_action => p_dynamic_action
            );
      end if;

      select coalesce(static_id,  'R'||to_char(region_id))
      into l_region_id
      from apex_application_page_regions
      where region_id = p_dynamic_action.affected_region_id;

    l_return.javascript_function := 'function() {window.hartenfeller_dev.plugins.ag_grid_offline_da.saveGrid({'|| 
                                  apex_javascript.add_attribute( p_name => 'regionId', p_value => l_region_id) ||
                                  '})  }';

      

      apex_debug.message('render');

      return l_return;
  end render_ag_grid_offline_da;

  function render_form_utils_da ( 
    p_dynamic_action apex_plugin.t_dynamic_action
  , p_plugin         apex_plugin.t_plugin
  )
    return apex_plugin.t_dynamic_action_render_result
  as
    l_return apex_plugin.t_dynamic_action_render_result;

    l_action               p_dynamic_action.attribute_01%type := p_dynamic_action.attribute_01;
    l_storage_id           p_dynamic_action.attribute_02%type := p_dynamic_action.attribute_02;
    l_storage_version      p_dynamic_action.attribute_03%type := p_dynamic_action.attribute_03;
    l_pk_item              p_dynamic_action.attribute_04%type := p_dynamic_action.attribute_04;
  begin
    if apex_application.g_debug then
        apex_plugin_util.debug_dynamic_action
          ( p_plugin         => p_plugin
          , p_dynamic_action => p_dynamic_action
          );
    end if;

    l_return.javascript_function := 'function() { ' ||
                                  'window.hartenfeller_dev.plugins.offline_form_utils.run({'|| 
                                  apex_javascript.add_attribute( p_name => 'action', p_value => l_action ) ||
                                  apex_javascript.add_attribute( p_name => 'storageId', p_value => l_storage_id ) ||
                                  apex_javascript.add_attribute( p_name => 'storageVersion', p_value => l_storage_version ) ||
                                  apex_javascript.add_attribute( p_name => 'pkPageItem', p_value => l_pk_item ) ||
                                  apex_javascript.add_attribute( p_name => 'regionId', p_value => p_plugin.attribute_01 ) ||
                                  '})  }';

    return l_return;
  end render_form_utils_da;

  function render_data_list_region ( 
    p_region              in apex_plugin.t_region
  , p_plugin              in apex_plugin.t_plugin
  , p_is_printer_friendly in boolean
  )
    return apex_plugin.t_region_render_result
  as
    l_result        apex_plugin.t_region_render_result;
    l_region_id     p_region.static_id%type    := p_region.static_id;

    --perform escaping
    l_region_id_esc p_region.static_id%type    := apex_escape.html_attribute(l_region_id);
  begin

    --debug
    if apex_application.g_debug 
    then
        apex_plugin_util.debug_region
          ( p_plugin => p_plugin
          , p_region => p_region
          );
    end if;

    --write html to buffer via sys.htp.p
    sys.htp.p('<div id="'|| l_region_id_esc ||'_wrapper"></div>');

    apex_javascript.add_onload_code (
      p_code => 'window.hartenfeller_dev.plugins.offline_data_list.initAPEXRegion({' ||
                apex_javascript.add_attribute(
                  p_name      => 'regionId'
                , p_value     => l_region_id_esc
                ) 
                ||
                apex_javascript.add_attribute(
                  p_name      => 'pageSize'
                , p_value     => to_number(p_region.attribute_04)
                )
                ||
                -- it is a fc so can't use add_attribute
                ' headerFc: ' || p_region.attribute_03 || ' , '
                ||
                apex_javascript.add_attribute(
                  p_name      => 'storageId'
                , p_value     => p_region.attribute_01
                )
                ||
                apex_javascript.add_attribute(
                  p_name      => 'storageVersion'
                , p_value     => to_number(p_region.attribute_02)
                )
                ||
                apex_javascript.add_attribute(
                  p_name      => 'valuePageItem'
                , p_value     => p_region.attribute_05
                )
                ||
                '});'
    );
    
    return l_result;
  end render_data_list_region;


  function get_table_region_col_info (
    p_region_id in varchar2
  )
    return tt_table_region_col_info
  as
    l_has_default_id     boolean;
    l_col_info_tab       tt_table_region_col_info;
  begin
    l_has_default_id := regexp_substr(p_region_id, 'R[0-9]+$') = p_region_id;

    if l_has_default_id then
      select c.name
          , c.data_type
          , case when c.is_visible = 'Yes' then 1 else 0 end as is_visible
          , c.heading
          , case when c.attribute_01 = 'Y' then 1 else 0 end as sortable
          , case when c.attribute_01 = 'Y' then 1 else 0 end as filterable
        bulk collect into l_col_info_tab
        from APEX_APPLICATION_PAGE_REGIONS r 
        join APEX_APPLICATION_PAGE_REG_COLS c
          on r.region_id = c.region_id
      where r.application_id = v('APP_ID')
        and r.page_id = v('APP_PAGE_ID')
        and r.region_id = to_number(replace(p_region_id, 'R', ''))
      order by c.display_sequence
      ;
    else 
      select c.name
          , c.data_type
          , case when c.is_visible = 'Yes' then 1 else 0 end as is_visible
          , c.heading
          , case when c.attribute_01 = 'Y' then 1 else 0 end as sortable
          , case when c.attribute_01 = 'Y' then 1 else 0 end as filterable
        bulk collect into l_col_info_tab
        from APEX_APPLICATION_PAGE_REGIONS r 
        join APEX_APPLICATION_PAGE_REG_COLS c
          on r.region_id = c.region_id
      where r.application_id = v('APP_ID')
        and r.page_id = v('APP_PAGE_ID')
        and r.static_id = p_region_id
      order by c.display_sequence
      ;
    end if;

    return l_col_info_tab;
  end get_table_region_col_info;


  function render_table_region ( 
    p_region              in apex_plugin.t_region
  , p_plugin              in apex_plugin.t_plugin
  , p_is_printer_friendly in boolean
  )
    return apex_plugin.t_region_render_result
  as
    l_result        apex_plugin.t_region_render_result;
    l_region_id     p_region.static_id%type    := p_region.static_id;

    --perform escaping
    l_region_id_esc p_region.static_id%type    := apex_escape.html_attribute(l_region_id);

    l_col_info_tab   tt_table_region_col_info;
    l_col_config_arr apex_t_varchar2;
    l_col_config_str varchar2(4000);
  begin

    --debug
    if apex_application.g_debug 
    then
        apex_plugin_util.debug_region
          ( p_plugin => p_plugin
          , p_region => p_region
          );
    end if;

    --write html to buffer via sys.htp.p
    sys.htp.p('<div id="'|| l_region_id_esc ||'_wrapper"></div>');

    l_col_info_tab := get_table_region_col_info(p_region.static_id);

    for i in 1 .. l_col_info_tab.count
    loop
      l_col_config_str := '{' ||
                          apex_javascript.add_attribute(
                            p_name      => 'name'
                          , p_value     => l_col_info_tab(i).name
                          )
                          ||
                          apex_javascript.add_attribute(
                            p_name      => 'heading'
                          , p_value     => l_col_info_tab(i).heading
                          )
                          ||
                          apex_javascript.add_attribute(
                            p_name      => 'dataType'
                          , p_value     => l_col_info_tab(i).data_type
                          )
                          ||
                          apex_javascript.add_attribute(
                            p_name      => 'isSortable'
                          , p_value     => l_col_info_tab(i).sortable = 1
                          )
                          ||
                          apex_javascript.add_attribute(
                            p_name      => 'isFilterable'
                          , p_value     => l_col_info_tab(i).filterable = 1
                          )
                          ||
                          apex_javascript.add_attribute(
                            p_name      => 'isVisible'
                          , p_value     => l_col_info_tab(i).is_visible = 1
                          )
                          ||
                          '}'
                          ;

      apex_string.push(l_col_config_arr, l_col_config_str);
    end loop;

    apex_javascript.add_onload_code (
      p_code => 'window.hartenfeller_dev.plugins.offline_table.initAPEXRegion({' ||
                apex_javascript.add_attribute(
                  p_name      => 'regionId'
                , p_value     => l_region_id_esc
                ) 
                ||
                apex_javascript.add_attribute(
                  p_name      => 'storageId'
                , p_value     => p_region.attribute_01
                )
                ||
                apex_javascript.add_attribute(
                  p_name      => 'storageVersion'
                , p_value     => to_number(p_region.attribute_02)
                )
                ||
                -- it is an object so can't use add_attribute
                ' colConfig: [' || apex_string.join(l_col_config_arr, ',') || '] , '
                ||
                '});'
    );
    
    return l_result;
  end render_table_region;


end plugin_apex_off_grid_pkg;
/
