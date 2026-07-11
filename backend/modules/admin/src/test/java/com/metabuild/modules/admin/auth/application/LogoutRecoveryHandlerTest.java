package com.metabuild.modules.admin.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.metabuild.shared.kernel.security.AuthorizationFence;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.security.AuthorizationState;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class LogoutRecoveryHandlerTest {
    @Test void completeFailureCanBeRetriedAfterFenceWasAlreadyDeleted() {
        UUID user = UUID.fromString("01900000-0000-7000-8000-000000000001");
        var fence = new AuthorizationFence(user, 3,
                UUID.fromString("01900000-0000-7000-8000-000000000099"), Instant.EPOCH);
        var fencePresent = new AtomicBoolean(true);
        var completes = new AtomicInteger();
        AuthorizationSnapshotStore snapshots = new AuthorizationSnapshotStore() {
            @Override public boolean initializeReady(AuthorizationSnapshot snapshot) { return false; }
            @Override public AuthorizationState load(UUID userId) { return fencePresent.get() ? fence : null; }
            @Override public boolean fence(AuthorizationFence value) { return false; }
            @Override public boolean deleteIfFence(AuthorizationFence value) { fencePresent.set(false); return true; }
            @Override public void delete(UUID userId) { fencePresent.set(false); }
        };
        RefreshTokenStore tokens = new NoopTokens();
        AccountSessionPort sessions = new NoopSessions();
        LogoutRecoveryPort recovery = new LogoutRecoveryPort() {
            @Override public void record(AuthorizationFence value, RuntimeException failure) {}
            @Override public void complete(AuthorizationFence value) {
                if (completes.getAndIncrement() == 0) throw new IllegalStateException("db down");
            }
        };
        var handler = new LogoutRecoveryHandler(tokens, sessions, snapshots, recovery);
        assertThatThrownBy(() -> handler.recover(fence)).isInstanceOf(IllegalStateException.class);
        assertThat(fencePresent).isFalse();
        handler.recover(fence);
        assertThat(completes).hasValue(2);
    }
    private static final class NoopTokens implements RefreshTokenStore {
        public String issue(UUID id){return "";} public RefreshRotationOutcome rotate(String t){return RefreshRotationOutcome.rejected();}
        public void revoke(String t){} public void revokeAll(UUID id){}
    }
    private static final class NoopSessions implements AccountSessionPort {
        public AccessSession login(UUID id){return new AccessSession("",1);} public void logoutToken(String t){} public void kickoutAll(UUID id){}
    }
}
