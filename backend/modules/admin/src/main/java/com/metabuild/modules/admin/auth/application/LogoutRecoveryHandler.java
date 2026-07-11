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
    public void recover(AuthorizationFence fence) {
        tokens.revokeAll(fence.userId());
        recovery.advance(fence, "TOKENS_REVOKED");
        sessions.kickoutAll(fence.userId());
        recovery.advance(fence, "SESSIONS_KICKED");
        if (!snapshots.deleteIfFence(fence)) throw new AuthorizationUnavailable();
        recovery.complete(fence);
    }
}
