package com.metabuild.modules.admin.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.metabuild.shared.kernel.security.AuthorizationFence;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.security.AuthorizationState;
import com.metabuild.shared.kernel.security.DataScopePolicy;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class RequestAuthorizationLoaderTest {
    private static final UUID USER = UUID.fromString("01900000-0000-7000-8000-000000000001");

    @Test
    void readsStoreOnlyOnceInsideARequest() {
        var reads = new AtomicInteger();
        var snapshot = new AuthorizationSnapshot(USER, 1, false, Set.of(), Set.of(), DataScopePolicy.denyAll(), Instant.EPOCH);
        AuthorizationSnapshotStore store = storeReturning(snapshot, reads);
        var request = new RequestAuthorizationLoader(store).newRequest();

        assertThat(request.load(USER)).isSameAs(snapshot);
        assertThat(request.load(USER)).isSameAs(snapshot);
        assertThat(reads).hasValue(1);
    }

    @Test
    void missingOrFencedStateFailsClosedAsUnavailable() {
        for (AuthorizationState state : new AuthorizationState[] {null,
                new AuthorizationFence(USER, 2, UUID.fromString("01900000-0000-7000-8000-000000000099"), Instant.EPOCH)}) {
            var loader = new RequestAuthorizationLoader(storeReturning(state, new AtomicInteger())).newRequest();
            assertThatThrownBy(() -> loader.load(USER)).isInstanceOf(AuthorizationUnavailable.class);
        }
    }

    private static AuthorizationSnapshotStore storeReturning(AuthorizationState state, AtomicInteger reads) {
        return new AuthorizationSnapshotStore() {
            @Override public boolean initializeReady(AuthorizationSnapshot snapshot) { return false; }
            @Override public AuthorizationState load(UUID userId) { reads.incrementAndGet(); return state; }
            @Override public boolean fence(com.metabuild.shared.kernel.security.AuthorizationFence fence) { return false; }
            @Override public boolean deleteIfFence(com.metabuild.shared.kernel.security.AuthorizationFence fence) { return false; }
            @Override public void delete(UUID userId) {}
        };
    }
}
