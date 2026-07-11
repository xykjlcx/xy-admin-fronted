create table mb_dept (
    id uuid primary key,
    parent_id uuid references mb_dept(id) on delete restrict,
    code varchar(64) not null,
    name varchar(128) not null,
    status varchar(16) not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
    sort_order integer not null default 0,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint mb_dept_not_self_parent check (parent_id is null or parent_id <> id)
);

create unique index mb_dept_code_active_uq on mb_dept (lower(code)) where deleted_at is null;
create index mb_dept_parent_active_idx on mb_dept (parent_id) where deleted_at is null;

create function mb_dept_reject_cycle() returns trigger language plpgsql as $$
begin
    -- Lock order for future authorization writes: AUTHZ_GRAPH first, then DEPT_TOPOLOGY.
    perform pg_advisory_xact_lock(hashtextextended('METABUILDER_DEPT_TOPOLOGY', 0));
    if new.parent_id is null then
        return new;
    end if;
    if exists (
        with recursive descendants(id) as (
            select id from mb_dept where parent_id = new.id and deleted_at is null
            union all
            select child.id
            from mb_dept child
            join descendants parent on child.parent_id = parent.id
            where child.deleted_at is null
        )
        select 1 from descendants where id = new.parent_id
    ) then
        raise exception 'department cycle is not allowed' using errcode = '23514';
    end if;
    return new;
end;
$$;

create trigger mb_dept_reject_cycle
before insert or update of parent_id on mb_dept
for each row execute function mb_dept_reject_cycle();

create table mb_user (
    id uuid primary key,
    dept_id uuid references mb_dept(id) on delete restrict,
    username varchar(128) not null,
    password_hash varchar(255) not null,
    display_name varchar(128) not null,
    email varchar(255),
    phone varchar(32),
    status varchar(16) not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
    authz_revision bigint not null default 0 check (authz_revision >= 0),
    deleted_at timestamp with time zone,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp
);

create unique index mb_user_username_active_uq on mb_user (lower(username)) where deleted_at is null;
create unique index mb_user_email_active_uq on mb_user (lower(email)) where deleted_at is null and email is not null;
create index mb_user_dept_active_idx on mb_user (dept_id) where deleted_at is null;

create function mb_user_authz_revision_monotonic() returns trigger language plpgsql as $$
begin
    if new.authz_revision < old.authz_revision then
        raise exception 'authz_revision cannot decrease' using errcode = '23514';
    end if;
    return new;
end;
$$;

create trigger mb_user_authz_revision_monotonic
before update of authz_revision on mb_user
for each row execute function mb_user_authz_revision_monotonic();

create table mb_role (
    id uuid primary key,
    code varchar(96) not null,
    name varchar(128) not null,
    system_role boolean not null default false,
    grants_system_admin boolean not null default false,
    data_scope_type varchar(32) not null,
    status varchar(16) not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
    deleted_at timestamp with time zone,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint mb_role_data_scope_type_check check (
        data_scope_type in ('ALL', 'SELF', 'OWN_DEPT', 'OWN_DEPT_AND_BELOW', 'CUSTOM_DEPT')
    ),
    constraint mb_role_system_admin_shape_check check (
        not grants_system_admin or (system_role and data_scope_type = 'ALL')
    )
);

create unique index mb_role_code_active_uq on mb_role (lower(code)) where deleted_at is null;
create unique index mb_role_single_system_admin_uq on mb_role ((1))
where grants_system_admin and status = 'ACTIVE' and deleted_at is null;

create table mb_role_custom_dept (
    role_id uuid not null references mb_role(id) on delete cascade,
    dept_id uuid not null references mb_dept(id) on delete cascade,
    created_at timestamp with time zone not null default current_timestamp,
    primary key (role_id, dept_id)
);

create function mb_role_custom_dept_guard() returns trigger language plpgsql as $$
declare
    selected_scope varchar(32);
    selected_status varchar(16);
    selected_deleted_at timestamp with time zone;
begin
    select data_scope_type, status, deleted_at
      into selected_scope, selected_status, selected_deleted_at
      from mb_role where id = new.role_id for update;
    if not found or selected_scope <> 'CUSTOM_DEPT'
       or selected_status <> 'ACTIVE' or selected_deleted_at is not null then
        raise exception 'custom department requires an active CUSTOM_DEPT role' using errcode = '23514';
    end if;
    if not exists (
        select 1 from mb_dept
        where id = new.dept_id and status = 'ACTIVE' and deleted_at is null
    ) then
        raise exception 'custom department relation requires an active department' using errcode = '23514';
    end if;
    return new;
end;
$$;

create trigger mb_role_custom_dept_guard
before insert or update on mb_role_custom_dept
for each row execute function mb_role_custom_dept_guard();

create function mb_role_cleanup_custom_dept() returns trigger language plpgsql as $$
begin
    if new.data_scope_type <> 'CUSTOM_DEPT' or new.status <> 'ACTIVE' or new.deleted_at is not null then
        delete from mb_role_custom_dept where role_id = new.id;
    end if;
    return new;
end;
$$;

create trigger mb_role_cleanup_custom_dept
after update of data_scope_type, status, deleted_at on mb_role
for each row execute function mb_role_cleanup_custom_dept();

-- Disabled/soft-deleted roles preserve user and permission grants for an explicit re-enable,
-- but cannot preserve CUSTOM_DEPT rows. Physical deletion cascades every relation.

create table mb_user_role (
    user_id uuid not null references mb_user(id) on delete cascade,
    role_id uuid not null references mb_role(id) on delete cascade,
    created_at timestamp with time zone not null default current_timestamp,
    primary key (user_id, role_id)
);

create index mb_user_role_role_idx on mb_user_role (role_id, user_id);

create table mb_permission (
    id uuid primary key,
    source_key varchar(255) not null,
    code varchar(160) not null,
    kind varchar(16) not null check (kind in ('PAGE', 'ACTION')),
    status varchar(16) not null default 'ACTIVE' check (status in ('ACTIVE', 'DEPRECATED')),
    first_seen_version varchar(64) not null,
    last_seen_version varchar(64) not null,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint mb_permission_code_grammar check (
        code ~ '^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$'
    ),
    constraint mb_permission_source_key_grammar check (
        source_key ~ '^/.+#(page|action:[a-z][a-z0-9-]*)$'
    )
);

create unique index mb_permission_code_active_uq on mb_permission (code) where deleted_at is null;
create unique index mb_permission_source_key_active_uq on mb_permission (source_key) where deleted_at is null;

create table mb_role_permission (
    role_id uuid not null references mb_role(id) on delete cascade,
    permission_id uuid not null references mb_permission(id) on delete cascade,
    created_at timestamp with time zone not null default current_timestamp,
    primary key (role_id, permission_id)
);

create index mb_role_permission_permission_idx on mb_role_permission (permission_id, role_id);

create table mb_menu (
    id uuid primary key,
    source_key varchar(255),
    origin varchar(16) not null check (origin in ('CATALOG', 'RUNTIME')),
    subsystem_key varchar(64) not null,
    route_key varchar(255),
    permission_id uuid references mb_permission(id) on delete restrict,
    default_parent_source_key varchar(255),
    default_label_key varchar(255) not null,
    default_icon varchar(96),
    default_sort integer not null default 0,
    default_visible boolean not null default true,
    status varchar(16) not null default 'ACTIVE' check (status in ('ACTIVE', 'DEPRECATED')),
    deleted_at timestamp with time zone,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint mb_menu_origin_shape_check check (
        (origin = 'CATALOG' and source_key is not null)
        or (origin = 'RUNTIME' and source_key is null and route_key is null and permission_id is null)
    )
);

create unique index mb_menu_source_key_active_uq on mb_menu (source_key) where deleted_at is null and source_key is not null;
create index mb_menu_subsystem_idx on mb_menu (subsystem_key, default_sort) where deleted_at is null;

create table mb_menu_customization (
    menu_id uuid primary key references mb_menu(id) on delete cascade,
    parent_overridden boolean not null default false,
    parent_id uuid references mb_menu(id) on delete restrict,
    label_key varchar(255),
    icon varchar(96),
    sort integer,
    visible boolean,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint mb_menu_customization_not_self_parent check (parent_id is null or parent_id <> menu_id)
);

create table mb_refresh_token (
    id uuid primary key,
    user_id uuid not null references mb_user(id) on delete cascade,
    family_id uuid not null,
    token_hash varchar(128) not null unique,
    expires_at timestamp with time zone not null,
    consumed_at timestamp with time zone,
    revoked_at timestamp with time zone,
    replaced_by_id uuid references mb_refresh_token(id) on delete set null,
    created_at timestamp with time zone not null default current_timestamp,
    constraint mb_refresh_token_expiry_check check (expires_at > created_at)
);

create index mb_refresh_token_user_active_idx on mb_refresh_token (user_id, expires_at)
where revoked_at is null;
create index mb_refresh_token_family_idx on mb_refresh_token (family_id);

create table mb_authz_refresh_outbox (
    id uuid primary key,
    operation_id uuid not null,
    user_id uuid not null references mb_user(id) on delete cascade,
    target_revision bigint not null check (target_revision >= 0),
    event_type varchar(32) not null check (event_type in ('REFRESH', 'TERMINAL')),
    status varchar(16) not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'DONE', 'FAILED')),
    attempts integer not null default 0 check (attempts >= 0),
    worker_id varchar(128),
    claimed_at timestamp with time zone,
    lease_until timestamp with time zone,
    next_attempt_at timestamp with time zone not null default current_timestamp,
    last_error text,
    created_at timestamp with time zone not null default current_timestamp,
    processed_at timestamp with time zone,
    unique (operation_id, user_id),
    constraint mb_authz_refresh_outbox_claim_shape_check check (
        (status = 'PROCESSING' and worker_id is not null and claimed_at is not null
            and lease_until is not null and lease_until > claimed_at)
        or (status <> 'PROCESSING' and worker_id is null and claimed_at is null and lease_until is null)
    )
);

create index mb_authz_refresh_outbox_pending_idx
on mb_authz_refresh_outbox (next_attempt_at, id) where status in ('PENDING', 'FAILED');
create index mb_authz_refresh_outbox_reclaim_idx
on mb_authz_refresh_outbox (lease_until, id) where status = 'PROCESSING';

create table mb_login_log (
    id uuid primary key,
    user_id uuid references mb_user(id) on delete set null,
    username varchar(128) not null,
    success boolean not null,
    failure_code varchar(160),
    ip_address inet,
    user_agent text,
    trace_id varchar(64),
    created_at timestamp with time zone not null default current_timestamp
);

create index mb_login_log_user_created_idx on mb_login_log (user_id, created_at desc);

create table mb_operation_log (
    id uuid primary key,
    actor_id uuid references mb_user(id) on delete set null,
    operation varchar(160) not null,
    resource_type varchar(96) not null,
    resource_id uuid,
    request_method varchar(16),
    request_path varchar(1024),
    success boolean not null,
    detail jsonb not null default '{}'::jsonb,
    trace_id varchar(64),
    created_at timestamp with time zone not null default current_timestamp
);

create index mb_operation_log_actor_created_idx on mb_operation_log (actor_id, created_at desc);
create index mb_operation_log_resource_idx on mb_operation_log (resource_type, resource_id, created_at desc);

insert into mb_dept (id, code, name)
values ('01900000-0000-7000-8000-000000000001', 'ROOT', 'MetaBuilder');

insert into mb_user (id, dept_id, username, password_hash, display_name, email)
values (
    '01900000-0000-7000-8000-000000000010',
    '01900000-0000-7000-8000-000000000001',
    'admin',
    '!bootstrap-credential-unset!',
    'Administrator',
    'admin@metabuilder.local'
);

insert into mb_role (id, code, name, system_role, grants_system_admin, data_scope_type)
values ('01900000-0000-7000-8000-000000000020', 'SYSTEM_ADMIN', 'System administrator', true, true, 'ALL');

insert into mb_user_role (user_id, role_id)
values ('01900000-0000-7000-8000-000000000010', '01900000-0000-7000-8000-000000000020');

insert into mb_permission (id, source_key, code, kind, first_seen_version, last_seen_version)
values
    ('01900000-0000-7000-8000-000000000101', '/_auth/admin/dashboard#page', 'dashboard:overview:view', 'PAGE', 'p1-bootstrap', 'p1-bootstrap'),
    ('01900000-0000-7000-8000-000000000102', '/_auth/admin/users#page', 'iam:user:view', 'PAGE', 'p1-bootstrap', 'p1-bootstrap'),
    ('01900000-0000-7000-8000-000000000103', '/_auth/admin/roles#page', 'iam:role:view', 'PAGE', 'p1-bootstrap', 'p1-bootstrap'),
    ('01900000-0000-7000-8000-000000000104', '/_auth/admin/menus#page', 'iam:menu:view', 'PAGE', 'p1-bootstrap', 'p1-bootstrap');

insert into mb_role_permission (role_id, permission_id)
select '01900000-0000-7000-8000-000000000020', id from mb_permission;

insert into mb_menu (
    id, source_key, origin, subsystem_key, route_key, permission_id,
    default_label_key, default_icon, default_sort
)
values
    ('01900000-0000-7000-8000-000000000201', '/_auth/admin/dashboard#page', 'CATALOG', 'admin', '/admin/dashboard', '01900000-0000-7000-8000-000000000101', 'nav.dashboard', 'layout-dashboard', 10),
    ('01900000-0000-7000-8000-000000000202', '/_auth/admin/users#page', 'CATALOG', 'admin', '/admin/users', '01900000-0000-7000-8000-000000000102', 'nav.users', 'users', 20),
    ('01900000-0000-7000-8000-000000000203', '/_auth/admin/roles#page', 'CATALOG', 'admin', '/admin/roles', '01900000-0000-7000-8000-000000000103', 'nav.roles', 'shield', 30),
    ('01900000-0000-7000-8000-000000000204', '/_auth/admin/menus#page', 'CATALOG', 'admin', '/admin/menus', '01900000-0000-7000-8000-000000000104', 'nav.menus', 'menu', 40);
