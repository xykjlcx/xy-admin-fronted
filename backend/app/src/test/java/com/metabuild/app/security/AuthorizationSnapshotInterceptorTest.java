package com.metabuild.app.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.metabuild.infrastructure.security.SaTokenSessionControl;
import com.metabuild.modules.admin.auth.application.AuthorizationSnapshotStore;
import com.metabuild.modules.admin.auth.application.RequestAuthorizationLoader;
import com.metabuild.shared.kernel.security.AuthorizationFence;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;
import com.metabuild.shared.kernel.security.AuthorizationState;
import com.metabuild.shared.kernel.security.DataScopePolicy;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class AuthorizationSnapshotInterceptorTest {
    private static final UUID USER = UUID.fromString("01900000-0000-7000-8000-000000000001");

    @Test void sameRequestLoadsOnceAndNewRequestLoadsAgain() {
        var reads = new AtomicInteger();
        var sessions = sessions(USER.toString());
        var first = interceptor(sessions, reads);
        first.preHandle(new MockHttpServletRequest(), new MockHttpServletResponse(), new Object());
        first.preHandle(new MockHttpServletRequest(), new MockHttpServletResponse(), new Object());
        assertThat(reads).hasValue(1);
        interceptor(sessions, reads).preHandle(new MockHttpServletRequest(), new MockHttpServletResponse(), new Object());
        assertThat(reads).hasValue(2);
    }

    @Test void unauthenticatedRequestDoesNotReadRedis() {
        var reads = new AtomicInteger();
        interceptor(sessions(null), reads).preHandle(new MockHttpServletRequest(), new MockHttpServletResponse(), new Object());
        assertThat(reads).hasValue(0);
    }

    private static AuthorizationSnapshotInterceptor interceptor(SaTokenSessionControl sessions, AtomicInteger reads) {
        var ready = new AuthorizationSnapshot(USER, 1, false, Set.of(), Set.of(), DataScopePolicy.denyAll(), Instant.EPOCH);
        AuthorizationSnapshotStore store = new AuthorizationSnapshotStore() {
            @Override public boolean initializeReady(AuthorizationSnapshot snapshot) { return false; }
            @Override public AuthorizationState load(UUID userId) { reads.incrementAndGet(); return ready; }
            @Override public boolean fence(AuthorizationFence fence) { return false; }
            @Override public boolean deleteIfFence(AuthorizationFence fence) { return false; }
            @Override public void delete(UUID userId) {}
        };
        return new AuthorizationSnapshotInterceptor(sessions,
                new RequestAuthorizationContext(new RequestAuthorizationLoader(store)));
    }
    private static SaTokenSessionControl sessions(String userId) {
        return new SaTokenSessionControl() { @Override public String currentUserId() { return userId; } };
    }
}
