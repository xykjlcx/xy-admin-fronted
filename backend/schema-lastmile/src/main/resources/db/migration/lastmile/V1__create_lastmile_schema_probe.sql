create table biz_schema_probe (
    id uuid primary key,
    owner_name varchar(32) not null check (owner_name = 'lastmile'),
    created_at timestamp with time zone not null default current_timestamp
);
