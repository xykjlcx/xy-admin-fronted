package com.metabuild.app.security;

import com.metabuild.infrastructure.security.SaTokenSessionControl;
import com.metabuild.modules.admin.auth.application.AccessSession;
import com.metabuild.modules.admin.auth.application.AccountSessionPort;
import java.util.UUID;

public final class AccountSessionAdapter implements AccountSessionPort {
    private final SaTokenSessionControl sessions;
    public AccountSessionAdapter(SaTokenSessionControl sessions) { this.sessions = sessions; }
    @Override public AccessSession login(UUID userId) {
        var token = sessions.login(userId.toString());
        return new AccessSession(token.value(), token.expiresInSeconds());
    }
    @Override public AccessSession login(UUID userId, long credentialRevision) {
        var token = sessions.login(userId.toString(), credentialRevision);
        return new AccessSession(token.value(), token.expiresInSeconds());
    }
    @Override public void logoutToken(String token) { sessions.logoutToken(token); }
    @Override public void kickoutAll(UUID userId) { sessions.kickoutAll(userId.toString()); }
    @Override public UUID currentUserId() {
        String userId = sessions.currentUserId();
        return userId == null ? null : UUID.fromString(userId);
    }
}
