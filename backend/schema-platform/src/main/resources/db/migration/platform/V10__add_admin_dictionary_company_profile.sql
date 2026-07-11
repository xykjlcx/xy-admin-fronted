create table mb_dictionary (
    id uuid primary key,
    name varchar(128) not null,
    code varchar(128) not null,
    remark varchar(512) not null default '',
    builtin boolean not null default false,
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint mb_dictionary_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
    constraint mb_dictionary_code_unique unique (code)
);

create table mb_dictionary_item (
    id uuid primary key,
    dictionary_id uuid not null references mb_dictionary(id) on delete cascade,
    label varchar(128) not null,
    value varchar(128) not null,
    sort integer not null,
    enabled boolean not null default true,
    color varchar(16) not null,
    remark varchar(512) not null default '',
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint mb_dictionary_item_color check (color in ('primary','success','warning','danger','neutral')),
    constraint mb_dictionary_item_value_unique unique (dictionary_id,value)
);
create index mb_dictionary_item_order on mb_dictionary_item(dictionary_id,sort,id);

create table mb_company (
    id uuid primary key,
    name varchar(200) not null,
    verified boolean not null default false,
    domain varchar(253) not null,
    code varchar(64) not null unique,
    industry varchar(200) not null,
    scale varchar(64) not null,
    data_residency varchar(128) not null,
    created_date date not null,
    contact_name varchar(128) not null,
    contact_email varchar(320) not null,
    contact_phone varchar(64) not null,
    landline varchar(64) not null default '',
    address varchar(512) not null,
    postal_code varchar(32) not null,
    updated_at timestamptz not null default current_timestamp
);

create table mb_user_profile (
    user_id uuid primary key references mb_user(id) on delete cascade,
    location varchar(200) not null default '',
    employee_no varchar(64) not null default '',
    title varchar(128) not null default '',
    joined_date date,
    manager_name varchar(128) not null default '',
    language varchar(32) not null default 'zh-CN',
    timezone varchar(128) not null default 'Asia/Shanghai',
    bio varchar(2000) not null default '',
    email_verified boolean not null default false,
    two_factor boolean not null default false,
    email_alert boolean not null default true,
    new_device_alert boolean not null default true,
    weekly_digest boolean not null default true,
    compact_notifications boolean not null default false,
    updated_at timestamptz not null default current_timestamp
);

insert into mb_company(id,name,verified,domain,code,industry,scale,data_residency,created_date,contact_name,contact_email,contact_phone,landline,address,postal_code)
values ('01900000-0000-7000-8000-000000000100','MetaBuilder',false,'metabuilder.local','METABUILDER','Software','1-49','China','2026-01-01','Administrator','admin@metabuilder.local','00000000000','','Shanghai','200000');

insert into mb_user_profile(user_id,location,employee_no,title,joined_date,manager_name,language,timezone,bio,email_verified)
select id,'Shanghai','E-001','Administrator',current_date,'','zh-CN','Asia/Shanghai','MetaBuilder administrator',true from mb_user
on conflict (user_id) do nothing;
