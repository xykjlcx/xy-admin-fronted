package com.metabuild.modules.admin.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.security.AuthorizationState;
import com.metabuild.shared.kernel.security.DataScopePolicy;
import java.util.Set;
import org.junit.jupiter.api.Test;

class RefreshTokenServiceTest {
    private static final UUID USER = UUID.fromString("01900000-0000-7000-8000-000000000001");
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-07-11T00:00:00Z"), ZoneOffset.UTC);

    @Test
    void rotatesOnceAndReplayRevokesWholeFamily() {
        var store = new AtomicRefreshTokenStore(CLOCK);
        var service = service(store, readyStore());
        var original = store.issue(USER);

        var rotated = service.rotate(original);

        assertThat(rotated.token()).isNotEqualTo(original);
        assertThatThrownBy(() -> service.rotate(original)).isInstanceOf(RefreshTokenRejected.class);
        assertThatThrownBy(() -> service.rotate(rotated.token())).isInstanceOf(RefreshTokenRejected.class);
    }

    @Test
    void winnerRemainsUsableUntilOriginalIsReplayedAfterCompletion() {
        var store = new AtomicRefreshTokenStore(CLOCK);
        var service = service(store, readyStore());
        var original = store.issue(USER);
        var winner = service.rotate(original);
        var next = service.rotate(winner.token());
        assertThat(next.token()).isNotBlank();
        assertThatThrownBy(() -> service.rotate(original)).isInstanceOf(RefreshTokenRejected.class);
        assertThatThrownBy(() -> service.rotate(next.token())).isInstanceOf(RefreshTokenRejected.class);
    }

    @Test
    void fencedUserCannotRotateAndFamilyStaysRevoked() {
        var store = new AtomicRefreshTokenStore(CLOCK);
        var service = service(store, new AuthorizationSnapshotStore() {
            @Override public boolean initializeReady(AuthorizationSnapshot snapshot) { return false; }
            @Override public AuthorizationState load(UUID userId) { return new com.metabuild.shared.kernel.security.AuthorizationFence(USER, 1, UUID.fromString("01900000-0000-7000-8000-000000000099"), Instant.EPOCH); }
            @Override public boolean fence(com.metabuild.shared.kernel.security.AuthorizationFence fence) { return false; }
            @Override public boolean deleteIfFence(com.metabuild.shared.kernel.security.AuthorizationFence fence) { return false; }
            @Override public void delete(UUID userId) {}
        });
        var token = store.issue(USER);
        assertThatThrownBy(() -> service.rotate(token)).isInstanceOf(RefreshTokenRejected.class);
        assertThatThrownBy(() -> service.rotate(token)).isInstanceOf(RefreshTokenRejected.class);
    }

    private static RefreshTokenService service(RefreshTokenStore store, AuthorizationSnapshotStore snapshots) {
        return new RefreshTokenService(store, snapshots);
    }

    private static AuthorizationSnapshotStore readyStore() {
        var ready = new AuthorizationSnapshot(USER, 1, false, Set.of(), Set.of(), DataScopePolicy.denyAll(), Instant.EPOCH);
        return new AuthorizationSnapshotStore() {
            @Override public boolean initializeReady(AuthorizationSnapshot snapshot) { return true; }
            @Override public AuthorizationState load(UUID userId) { return ready; }
            @Override public boolean fence(com.metabuild.shared.kernel.security.AuthorizationFence fence) { return false; }
            @Override public boolean deleteIfFence(com.metabuild.shared.kernel.security.AuthorizationFence fence) { return false; }
            @Override public void delete(UUID userId) {}
        };
    }
}
