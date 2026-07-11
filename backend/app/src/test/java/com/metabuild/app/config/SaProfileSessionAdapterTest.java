package com.metabuild.app.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.metabuild.infrastructure.security.SaTokenSessionControl;
import com.metabuild.modules.admin.auth.application.RefreshRotationOutcome;
import com.metabuild.modules.admin.auth.application.RefreshTokenStore;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SaProfileSessionAdapterTest {
    private static final UUID USER = UUID.fromString("01900000-0000-7000-8000-000000000010");

    @Test void credentialsChangedPreservesNamedCurrentSessionRevokesOthersAndAllRefreshTokens() {
        var sessions = new Sessions();
        var refresh = new RefreshTokens();
        var adapter = new SaProfileSessionAdapter(sessions, refresh);
        String protectedSession = adapter.currentSessionId();

        sessions.revisions.put("current-token", 1L);
        sessions.revisions.put("other-token", 1L);
        adapter.credentialsChanged(USER, protectedSession, 2L);

        assertThat(refresh.revokedUsers).containsExactly(USER);
        assertThat(sessions.loggedOut).containsExactly("other-token");
    }

    @Test void recoveryWithoutRequestContextStillPreservesPersistedSessionId() {
        var sessions = new Sessions();
        var refresh = new RefreshTokens();
        var adapter = new SaProfileSessionAdapter(sessions, refresh);
        String protectedSession = adapter.currentSessionId();
        sessions.current = null;

        sessions.revisions.put("current-token", 1L);
        sessions.revisions.put("other-token", 1L);
        adapter.credentialsChanged(USER, protectedSession, 2L);

        assertThat(sessions.loggedOut).containsExactly("other-token");
        assertThat(refresh.revokedUsers).containsExactly(USER);
    }

    @Test void replayOfOldCredentialEventDoesNotRevokeNewGenerationSession() {
        var sessions = new Sessions();
        sessions.current = null;
        sessions.revisions.put("current-token", 2L);
        sessions.revisions.put("other-token", null);
        var adapter = new SaProfileSessionAdapter(sessions, new RefreshTokens());

        adapter.credentialsChanged(USER, "no-protected-session", 2L);

        assertThat(sessions.loggedOut).containsExactly("other-token");
        assertThat(sessions.tokenActive("current-token")).isTrue();
    }

    private static final class Sessions extends SaTokenSessionControl {
        String current = "current-token";
        final List<String> loggedOut = new ArrayList<>();
        final java.util.Map<String,Long> revisions = new java.util.HashMap<>();
        @Override public String currentTokenValue() { return current; }
        @Override public List<String> tokenValues(String userId) { return List.of("current-token", "other-token"); }
        @Override public boolean tokenActive(String token) { return !loggedOut.contains(token); }
        @Override public void logoutToken(String token) { loggedOut.add(token); }
        @Override public Long credentialRevision(String token) { return revisions.get(token); }
    }

    private static final class RefreshTokens implements RefreshTokenStore {
        final List<UUID> revokedUsers = new ArrayList<>();
        public String issue(UUID userId) { throw new UnsupportedOperationException(); }
        public RefreshRotationOutcome rotate(String token) { throw new UnsupportedOperationException(); }
        public void revoke(String token) { throw new UnsupportedOperationException(); }
        public void revokeAll(UUID userId) { revokedUsers.add(userId); }
    }
}
