create table mb_schema_probe (
    id uuid primary key,
    owner_name varchar(32) not null check (owner_name = 'platform'),
    created_at timestamp with time zone not null default current_timestamp
);
