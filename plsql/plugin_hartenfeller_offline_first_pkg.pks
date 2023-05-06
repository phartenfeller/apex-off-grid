create or replace package plugin_hartenfeller_offline_first_pkg as 

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

end plugin_hartenfeller_offline_first_pkg;
/
