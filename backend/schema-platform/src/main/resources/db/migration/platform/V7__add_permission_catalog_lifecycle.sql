create table mb_permission_catalog_version (
    version integer primary key,
    digest char(64) not null unique,
    applied_at timestamp with time zone not null default current_timestamp
);

create table mb_permission_alias (
    old_code varchar(160) primary key,
    permission_id uuid not null references mb_permission(id) on delete restrict,
    catalog_version integer not null,
    created_at timestamp with time zone not null default current_timestamp,
    constraint mb_permission_alias_code_grammar check (
        old_code ~ '^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$'
    )
);

alter table mb_menu add column default_path varchar(255);
alter table mb_menu add column default_type varchar(16) not null default 'dir'
    check (default_type in ('dir', 'menu'));

update mb_menu
set default_path = case when route_key like '/%' then route_key end,
    default_type = case when route_key is null then 'dir' else 'menu' end;

alter table mb_menu add constraint mb_menu_catalog_navigation_shape check (
    origin <> 'CATALOG'
    or default_type = 'dir'
    or (route_key is not null and default_path is not null)
);
