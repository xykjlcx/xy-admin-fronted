create table mb_inbox_message (
    id uuid primary key,
    recipient_user_id uuid not null references mb_user(id) on delete cascade,
    idempotency_key varchar(255) not null,
    category varchar(32) not null check (category in ('approval', 'security', 'system')),
    title varchar(255) not null,
    sender varchar(128) not null,
    body text not null,
    link varchar(1024),
    unread boolean not null default true,
    approval_status varchar(16) check (approval_status in ('pending', 'approved', 'rejected')),
    decided_at timestamp with time zone,
    decided_by uuid references mb_user(id) on delete set null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    unique (recipient_user_id, idempotency_key),
    constraint mb_inbox_approval_shape check (
        (category = 'approval' and approval_status is not null)
        or (category <> 'approval' and approval_status is null)
    )
);

create index mb_inbox_recipient_created_idx
    on mb_inbox_message (recipient_user_id, created_at desc);
create index mb_inbox_recipient_unread_idx
    on mb_inbox_message (recipient_user_id, unread, created_at desc);

insert into mb_inbox_message (
    id, recipient_user_id, idempotency_key, category, title, sender, body, approval_status
) values (
    '01900000-0000-7000-8000-000000000801',
    '01900000-0000-7000-8000-000000000010',
    'bootstrap:welcome', 'system', 'MetaBuilder 已就绪', 'MetaBuilder',
    '真实后端已连接，可以开始使用管理功能。', null
) on conflict do nothing;
