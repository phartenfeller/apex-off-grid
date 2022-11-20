create or replace package body plugin_hartenfeller_offline_first_pkg as 

 function render_da( 
    p_dynamic_action apex_plugin.t_dynamic_action
  , p_plugin         apex_plugin.t_plugin
  )
    return apex_plugin.t_dynamic_action_render_result
  as
    l_return apex_plugin.t_dynamic_action_render_result;
  begin
    if apex_application.g_debug then
        apex_plugin_util.debug_dynamic_action
          ( p_plugin         => p_plugin
          , p_dynamic_action => p_dynamic_action
          );
    end if;

    l_return.javascript_function := 'function() { setTimeout(() => window.hartenfeller_dev.plugins.sync_offline_data.sync({'|| 
                                  apex_javascript.add_attribute( p_name => 'ajaxId', p_value => apex_plugin.get_ajax_identifier ) ||
                                  '}), 5 * 1000)  }';

    apex_debug.message('render');

    return l_return;
  end render_da;


end plugin_hartenfeller_offline_first_pkg;
/
