create or replace package body aog_utils_pkg as 

  function slugify (p_string in varchar2) 
    return varchar2
  as
     l_str varchar2(32767);
  begin
    -- trim leading and trailing whitespace
    l_str := trim(both ' ' from p_string);

    -- convert to lowercase
    l_str := lower(l_str);

    -- remove non-alphanumeric characters except spaces and hyphens
    l_str := regexp_replace(l_str, '[^a-z0-9 -]', '');

    -- replace spaces with hyphens
    l_str := regexp_replace(l_str, '\s+', '-');

    -- replace consecutive hyphens with a single hyphen
    l_str := regexp_replace(l_str, '-+', '-');

    return l_str;
  end slugify;

end aog_utils_pkg;
/
