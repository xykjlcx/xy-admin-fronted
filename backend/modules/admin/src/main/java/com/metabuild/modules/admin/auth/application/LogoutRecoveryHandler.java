package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.security.AuthorizationFence;

/** Task16 worker 可调用的单条 LOGOUT_ALL 恢复执行器；不负责扫描或调度。 */
public final class LogoutRecoveryHandler {
    private final RefreshTokenStore tokens;
    private final AccountSessionPort sessions;
    private final AuthorizationSnapshotStore snapshots;
    private final LogoutRecoveryPort recovery;
    public LogoutRecoveryHandler(RefreshTokenStore tokens, AccountSessionPort sessions,
            AuthorizationSnapshotStore snapshots, LogoutRecoveryPort recovery) {
        this.tokens=tokens; this.sessions=sessions; this.snapshots=snapshots; this.recovery=recovery;
    }
    public void recover(AuthorizationFence fence) { recover(fence, "FENCED"); }
    public void recover(AuthorizationFence fence, String phase) {
        recoverSteps(fence,phase);
        if (!snapshots.deleteIfFence(fence)) throw new AuthorizationUnavailable();
    }
    public void recover(AuthorizationFence fence,String phase,AuthorizationBatchSnapshotStore batch) {
        recoverSteps(fence,phase);
        if(!batch.terminalDelete(fence.operationId(),fence.userId(),fence.targetRevision()))throw new AuthorizationUnavailable();
    }
    private void recoverSteps(AuthorizationFence fence,String phase) {
        if ("FENCED".equals(phase)) {
            tokens.revokeAll(fence.userId());
            if(!recovery.advance(fence,"FENCED", "TOKENS_REVOKED"))throw new AuthorizationUnavailable();
            phase="TOKENS_REVOKED";
        }
        if ("TOKENS_REVOKED".equals(phase)) {
            sessions.kickoutAll(fence.userId());
            if(!recovery.advance(fence,"TOKENS_REVOKED", "SESSIONS_KICKED"))throw new AuthorizationUnavailable();
        }
    }
}
