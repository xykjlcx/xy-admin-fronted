package com.metabuild.modules.admin.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.metabuild.shared.kernel.Unauthorized;
import com.metabuild.shared.kernel.security.AuthorizationFence;
import com.metabuild.shared.kernel.security.AuthorizationState;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.Test;

class AuthenticationServiceTest {

    private static final UUID USER = UUID.fromString("01900000-0000-7000-8000-000000000001");
    private static final UUID DEPT = UUID.fromString("01900000-0000-7000-8000-000000000002");
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-07-11T00:00:00Z"), ZoneOffset.UTC);

    @Test
    void correctPasswordCreatesAccountSessionAndSingleReadySnapshot() {
        var users = new FakeUsers(new AuthUser(USER, "admin", "encoded", true, false));
        var snapshots = new FakeSnapshots();
        var sessions = new FakeSessions();
        var service = service(users, snapshots, sessions);

        var result = service.login("admin", "secret");

        assertThat(result.accessToken()).isEqualTo("access");
        assertThat(result.refreshToken()).isNotBlank();
        assertThat(snapshots.writes).hasSize(1);
        assertThat(sessions.accountSessionKeys).doesNotContainKeys(
                "roles", "permissions", "dataScope", "authorizationSnapshot");
    }

    @Test
    void wrongPasswordDisabledAndDeletedUsersAreRejectedWithoutSession() {
        for (var user : List.of(
                new AuthUser(USER, "admin", "other", true, false),
                new AuthUser(USER, "admin", "encoded", false, false),
                new AuthUser(USER, "admin", "encoded", true, true))) {
            var sessions = new FakeSessions();
            var service = service(new FakeUsers(user), new FakeSnapshots(), sessions);
            assertThatThrownBy(() -> service.login("admin", "secret")).isInstanceOf(Unauthorized.class);
            assertThat(sessions.loginCount).isZero();
        }
    }

    @Test
    void lowerRevisionLoginCannotOverwriteFence() {
        var snapshots = new FakeSnapshots();
        snapshots.state = new AuthorizationFence(USER, 9,
                UUID.fromString("01900000-0000-7000-8000-000000000099"), Instant.EPOCH);
        var sessions = new FakeSessions();
        var tokens = new InMemoryRefreshTokenStore(CLOCK);
        var service = service(new FakeUsers(new AuthUser(USER, "admin", "encoded", true, false)), snapshots, sessions, tokens);

        assertThatThrownBy(() -> service.login("admin", "secret"))
                .isInstanceOf(AuthorizationUnavailable.class);
        assertThat(snapshots.state).isInstanceOf(AuthorizationFence.class);
        assertThat(sessions.loginCount).isZero();
        assertThat(tokens.revoked).isEqualTo(tokens.issued);
    }

    private static AuthenticationService service(FakeUsers users, FakeSnapshots snapshots, FakeSessions sessions) {
        return service(users, snapshots, sessions, new InMemoryRefreshTokenStore(CLOCK));
    }
    private static AuthenticationService service(FakeUsers users, FakeSnapshots snapshots, FakeSessions sessions,
            InMemoryRefreshTokenStore tokens) {
        var graph = new AuthorizationGraph(USER, 1, DEPT, List.of());
        return new AuthenticationService(users, (raw, encoded) -> raw.equals("secret") && encoded.equals("encoded"),
                ignored -> java.util.Map.of(USER, graph), new AuthorizationSnapshotCompiler(), snapshots, sessions,
                tokens, CLOCK,
                () -> UUID.fromString("01900000-0000-7000-8000-000000000099"), (fence, failure) -> {});
    }

    private static final class FakeUsers implements AuthUserRepository {
        private final AuthUser user;
        private FakeUsers(AuthUser user) { this.user = user; }
        @Override public AuthUser findByUsername(String username) { return user; }
    }

    private static final class FakeSnapshots implements AuthorizationSnapshotStore {
        private AuthorizationState state;
        private final List<AuthorizationState> writes = new ArrayList<>();
        @Override public boolean initializeReady(com.metabuild.shared.kernel.security.AuthorizationSnapshot snapshot) {
            if (state instanceof AuthorizationFence fence && fence.targetRevision() >= snapshot.revision()) return false;
            if (state instanceof com.metabuild.shared.kernel.security.AuthorizationSnapshot ready && ready.revision() > snapshot.revision()) return false;
            state = snapshot; writes.add(snapshot); return true;
        }
        @Override public AuthorizationState load(UUID userId) { return state; }
        @Override public boolean fence(com.metabuild.shared.kernel.security.AuthorizationFence fence) { state=fence; return true; }
        @Override public boolean deleteIfFence(com.metabuild.shared.kernel.security.AuthorizationFence fence) { if (state.equals(fence)) { state=null; return true; } return false; }
        @Override public void delete(UUID userId) { state = null; }
    }

    private static final class FakeSessions implements AccountSessionPort {
        private int loginCount;
        private final Map<String, Object> accountSessionKeys = new ConcurrentHashMap<>();
        @Override public AccessSession login(UUID userId) { loginCount++; accountSessionKeys.put("username", "admin"); return new AccessSession("access", 3600); }
        @Override public void logoutToken(String token) { loginCount--; }
        @Override public void kickoutAll(UUID userId) {}
    }
}
