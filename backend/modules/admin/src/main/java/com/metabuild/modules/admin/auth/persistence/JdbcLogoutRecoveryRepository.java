package com.metabuild.modules.admin.auth.persistence;

import com.metabuild.modules.admin.auth.application.LogoutRecoveryPort;
import com.metabuild.shared.kernel.UuidV7Generator;
import com.metabuild.shared.kernel.security.AuthorizationFence;
import org.springframework.jdbc.core.JdbcTemplate;

public final class JdbcLogoutRecoveryRepository implements LogoutRecoveryPort {
    private final JdbcTemplate jdbc;
    private final UuidV7Generator ids;
    public JdbcLogoutRecoveryRepository(JdbcTemplate jdbc, UuidV7Generator ids) { this.jdbc=jdbc; this.ids=ids; }
    @Override public void record(AuthorizationFence fence, RuntimeException failure) {
        jdbc.update("""
                insert into mb_authz_refresh_outbox(
                    id,operation_id,user_id,target_revision,event_type,status,recovery_phase,recovery_payload,last_error)
                values (?,?,?,?, 'LOGOUT_ALL','FAILED','FENCED',jsonb_build_object('operationId',?::text),?)
                on conflict(operation_id,user_id) do update set
                    status='FAILED',recovery_phase='FENCED',recovery_payload=excluded.recovery_payload,last_error=excluded.last_error
                """, ids.generate(), fence.operationId(), fence.userId(), fence.targetRevision(),
                fence.operationId(), failure.getClass().getSimpleName());
    }
    @Override public void complete(AuthorizationFence fence) {
        jdbc.update("""
                update mb_authz_refresh_outbox set status='DONE',recovery_phase='SESSIONS_KICKED',processed_at=current_timestamp
                where operation_id=? and user_id=? and event_type='LOGOUT_ALL'
                """, fence.operationId(), fence.userId());
    }
    @Override public void advance(AuthorizationFence fence, String phase) {
        jdbc.update("""
                update mb_authz_refresh_outbox set recovery_phase=?
                where operation_id=? and user_id=? and event_type='LOGOUT_ALL' and status<>'DONE'
                """, phase, fence.operationId(), fence.userId());
    }
}
