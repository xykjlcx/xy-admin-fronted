alter table mb_authz_refresh_outbox
    drop constraint mb_authz_refresh_outbox_event_type_check;

alter table mb_authz_refresh_outbox
    add constraint mb_authz_refresh_outbox_event_type_check
    check (event_type in ('REFRESH', 'TERMINAL', 'LOGOUT_ALL'));

alter table mb_authz_refresh_outbox
    add column recovery_phase varchar(32),
    add column recovery_payload jsonb not null default '{}'::jsonb;

alter table mb_authz_refresh_outbox
    add constraint mb_authz_refresh_outbox_recovery_shape_check check (
        (event_type = 'LOGOUT_ALL' and recovery_phase in ('FENCED', 'TOKENS_REVOKED', 'SESSIONS_KICKED'))
        or (event_type <> 'LOGOUT_ALL' and recovery_phase is null)
    );
