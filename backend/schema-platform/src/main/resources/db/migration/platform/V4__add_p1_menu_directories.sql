insert into mb_menu (
    id, source_key, origin, subsystem_key, default_label_key, default_icon, default_sort
) values
    ('01900000-0000-7000-8000-000000000211', '/_auth/admin#workspace', 'CATALOG', 'admin', 'nav.workspace', 'layout-dashboard', 1),
    ('01900000-0000-7000-8000-000000000212', '/_auth/admin#organization', 'CATALOG', 'admin', 'nav.organization', 'users', 2);

update mb_menu set default_parent_source_key = '/_auth/admin#workspace', default_sort = 1
where source_key = '/_auth/admin/dashboard#page';

update mb_menu set default_parent_source_key = '/_auth/admin#organization',
    default_sort = case source_key
        when '/_auth/admin/users#page' then 1
        when '/_auth/admin/roles#page' then 2
        else 3 end
where source_key in ('/_auth/admin/users#page','/_auth/admin/roles#page','/_auth/admin/menus#page');
