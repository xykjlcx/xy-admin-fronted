create table mb_credential_revocation_outbox (
    id uuid primary key,
    user_id uuid not null references mb_user(id) on delete cascade,
    credential_revision bigint not null,
    event_type varchar(32) not null default 'CREDENTIALS_CHANGED',
    status varchar(16) not null default 'PENDING',
    attempts integer not null default 0,
    next_attempt_at timestamptz not null default current_timestamp,
    last_error text,
    created_at timestamptz not null default current_timestamp,
    processed_at timestamptz,
    constraint mb_credential_revocation_event_check check (event_type = 'CREDENTIALS_CHANGED'),
    constraint mb_credential_revocation_status_check check (status in ('PENDING','PROCESSING','DONE','FAILED')),
    constraint mb_credential_revocation_revision_check check (credential_revision >= 0)
);

create index mb_credential_revocation_pending_idx
    on mb_credential_revocation_outbox(next_attempt_at,id)
    where status in ('PENDING','FAILED');
