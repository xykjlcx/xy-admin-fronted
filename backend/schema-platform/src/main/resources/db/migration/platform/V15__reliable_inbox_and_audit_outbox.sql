create table mb_inbox_publish_outbox (
    id uuid primary key,
    recipient_user_id uuid not null references mb_user(id) on delete cascade,
    idempotency_key varchar(255) not null,
    category varchar(32) not null check (category in ('approval','security','system')),
    title varchar(255) not null,
    body text not null,
    link varchar(1024),
    status varchar(16) not null default 'PENDING' check (status in ('PENDING','PROCESSING','DONE','FAILED')),
    attempts integer not null default 0 check (attempts >= 0),
    worker_id varchar(128),
    lease_until timestamp with time zone,
    next_attempt_at timestamp with time zone not null default current_timestamp,
    last_error text,
    created_at timestamp with time zone not null default current_timestamp,
    processed_at timestamp with time zone,
    unique (recipient_user_id,idempotency_key),
    constraint mb_inbox_publish_claim_shape check (
      (status='PROCESSING' and worker_id is not null and lease_until is not null)
      or (status<>'PROCESSING' and worker_id is null and lease_until is null)
    )
);
create index mb_inbox_publish_ready_idx on mb_inbox_publish_outbox(next_attempt_at,created_at)
where status in ('PENDING','FAILED','PROCESSING');

create table mb_login_audit_outbox (
    id uuid primary key,
    user_id uuid references mb_user(id) on delete set null,
    username varchar(128) not null,
    success boolean not null,
    failure_code varchar(160),
    ip_address inet,
    user_agent text,
    status varchar(16) not null default 'PENDING' check (status in ('PENDING','PROCESSING','DONE','FAILED')),
    attempts integer not null default 0 check (attempts >= 0),
    worker_id varchar(128), lease_until timestamp with time zone,
    next_attempt_at timestamp with time zone not null default current_timestamp,
    last_error text, created_at timestamp with time zone not null default current_timestamp,
    processed_at timestamp with time zone,
    constraint mb_login_audit_claim_shape check (
      (status='PROCESSING' and worker_id is not null and lease_until is not null)
      or (status<>'PROCESSING' and worker_id is null and lease_until is null)
    )
);
create index mb_login_audit_ready_idx on mb_login_audit_outbox(next_attempt_at,created_at)
where status in ('PENDING','FAILED','PROCESSING');
