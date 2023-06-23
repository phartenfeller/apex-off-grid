create or replace package plugin_apex_off_grid_pkg as 

 function render_da( 
    p_dynamic_action apex_plugin.t_dynamic_action
  , p_plugin         apex_plugin.t_plugin
  )
    return apex_plugin.t_dynamic_action_render_result
  ;

  function ajax_da( 
    p_dynamic_action apex_plugin.t_dynamic_action
  , p_plugin         apex_plugin.t_plugin
  ) 
    return apex_plugin.t_dynamic_action_ajax_result
  ;

  function render_ag_grid_offline_da ( 
    p_dynamic_action apex_plugin.t_dynamic_action
  , p_plugin         apex_plugin.t_plugin
  )
    return apex_plugin.t_dynamic_action_render_result
  ;

  function render_form_utils_da ( 
    p_dynamic_action apex_plugin.t_dynamic_action
  , p_plugin         apex_plugin.t_plugin
  )
    return apex_plugin.t_dynamic_action_render_result
  ;

  function render_data_list_region ( 
    p_region              in apex_plugin.t_region
  , p_plugin              in apex_plugin.t_plugin
  , p_is_printer_friendly in boolean
  )
    return apex_plugin.t_region_render_result
  ;


  function render_table_region ( 
    p_region              in apex_plugin.t_region
  , p_plugin              in apex_plugin.t_plugin
  , p_is_printer_friendly in boolean
  )
    return apex_plugin.t_region_render_result
  ;

  

end plugin_apex_off_grid_pkg;
/
