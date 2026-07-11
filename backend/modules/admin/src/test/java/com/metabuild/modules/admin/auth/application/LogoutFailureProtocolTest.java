package com.metabuild.modules.admin.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.metabuild.shared.kernel.security.AuthorizationFence;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.security.AuthorizationState;
import com.metabuild.shared.kernel.security.DataScopePolicy;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class LogoutFailureProtocolTest {
    private static final UUID USER = UUID.fromString("01900000-0000-7000-8000-000000000001");
    private static final UUID OP = UUID.fromString("01900000-0000-7000-8000-000000000099");
    private static final Clock CLOCK = Clock.fixed(Instant.EPOCH, ZoneOffset.UTC);

    enum Failure { FENCE, REVOKE, KICKOUT, DELETE, RECORD }

    @ParameterizedTest
    @EnumSource(Failure.class)
    void everyLogoutFailureLeavesNoReadyStateAndReportsStable503(Failure failure) {
        var snapshots = new FailingSnapshots(failure);
        var tokens = new FailingTokens(failure);
        var sessions = new FailingSessions(failure);
        var recovery = new FailingRecovery(failure);
        var service = new AuthenticationService(username -> null, (a,b) -> false,
                ignored -> Map.of(), new AuthorizationSnapshotCompiler(), snapshots, sessions,
                tokens, CLOCK, () -> OP, recovery);

        assertThatThrownBy(() -> service.logoutAll(USER)).isInstanceOf(AuthorizationUnavailable.class);
        assertThat(snapshots.state instanceof AuthorizationSnapshot).isFalse();
        if (failure != Failure.FENCE) assertThat(snapshots.state).isInstanceOf(AuthorizationFence.class);
        if (failure == Failure.REVOKE || failure == Failure.KICKOUT || failure == Failure.DELETE) {
            assertThat(recovery.recorded).isTrue();
        }
    }

    private static final class FailingSnapshots implements AuthorizationSnapshotStore {
        private final Failure failure;
        private AuthorizationState state = new AuthorizationSnapshot(USER, 3, false, Set.of(), Set.of(), DataScopePolicy.denyAll(), Instant.EPOCH);
        private FailingSnapshots(Failure failure) { this.failure=failure; }
        @Override public boolean initializeReady(AuthorizationSnapshot snapshot) { return false; }
        @Override public AuthorizationState load(UUID userId) { return state; }
        @Override public boolean fence(AuthorizationFence fence) { if (failure == Failure.FENCE) { state=null; return false; } state=fence; return true; }
        @Override public boolean deleteIfFence(AuthorizationFence fence) { if (failure == Failure.DELETE || failure == Failure.RECORD) throw new IllegalStateException("delete"); state=null; return true; }
        @Override public void delete(UUID userId) { state=null; }
    }
    private static final class FailingTokens implements RefreshTokenStore {
        private final Failure failure; private FailingTokens(Failure failure) { this.failure=failure; }
        @Override public String issue(UUID userId) { return "token"; }
        @Override public RefreshRotationOutcome rotate(String token) { return RefreshRotationOutcome.rejected(); }
        @Override public void revoke(String token) {}
        @Override public void revokeAll(UUID userId) { if (failure == Failure.REVOKE) throw new IllegalStateException("revoke"); }
    }
    private static final class FailingSessions implements AccountSessionPort {
        private final Failure failure; private FailingSessions(Failure failure) { this.failure=failure; }
        @Override public AccessSession login(UUID userId,long revision) { return new AccessSession("a",1); }
        @Override public void logoutToken(String token) {}
        @Override public void kickoutAll(UUID userId) { if (failure == Failure.KICKOUT) throw new IllegalStateException("kickout"); }
    }
    private static final class FailingRecovery implements LogoutRecoveryPort {
        private final Failure failure; private boolean recorded;
        private FailingRecovery(Failure failure) { this.failure=failure; }
        @Override public void record(AuthorizationFence fence, RuntimeException error) { recorded=true; if (failure == Failure.RECORD) throw new IllegalStateException("db unavailable"); }
    }
}
