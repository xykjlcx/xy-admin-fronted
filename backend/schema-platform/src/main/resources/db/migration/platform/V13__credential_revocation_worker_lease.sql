alter table mb_credential_revocation_outbox
    add column protected_session_id varchar(64),
    add column worker_id uuid,
    add column claimed_at timestamptz,
    add column lease_until timestamptz;

-- V12 worker 可能已在 claim 后崩溃。旧 PROCESSING 没有 lease 所有权，
-- 升级时必须放回可重试队列，否则 claim-shape 约束无法安全建立。
update mb_credential_revocation_outbox
set status = 'FAILED',
    next_attempt_at = current_timestamp,
    last_error = coalesce(last_error, 'Recovered legacy PROCESSING task during V13 upgrade')
where status = 'PROCESSING';

alter table mb_credential_revocation_outbox
    add constraint mb_credential_revocation_claim_shape check (
        (status = 'PROCESSING'
            and worker_id is not null
            and claimed_at is not null
            and lease_until is not null
            and lease_until > claimed_at)
        or
        (status <> 'PROCESSING'
            and worker_id is null
            and claimed_at is null
            and lease_until is null)
    );

create index mb_credential_revocation_reclaim_idx
    on mb_credential_revocation_outbox(lease_until,id)
    where status = 'PROCESSING';
