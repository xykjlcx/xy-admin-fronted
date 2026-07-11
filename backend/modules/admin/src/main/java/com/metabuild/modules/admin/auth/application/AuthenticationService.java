package com.metabuild.modules.admin.auth.application;

import com.metabuild.shared.kernel.ErrorCode;
import com.metabuild.shared.kernel.Unauthorized;
import java.time.Clock;
import java.util.UUID;
import java.util.function.Supplier;
import com.metabuild.shared.kernel.security.AuthorizationFence;
import com.metabuild.shared.kernel.security.AuthorizationSnapshot;

public final class AuthenticationService {
    private static final ErrorCode INVALID_CREDENTIALS = () -> "auth.credentials.invalid";
    private static final ErrorCode CREDENTIALS_CHANGED = () -> "auth.credentials.changed";
    private final AuthUserRepository users;
    private final PasswordVerifier passwords;
    private final AuthorizationGraphRepository graphs;
    private final AuthorizationSnapshotCompiler compiler;
    private final AuthorizationSnapshotStore snapshots;
    private final AccountSessionPort sessions;
    private final RefreshTokenStore refreshTokens;
    private final Clock clock;
    private final Supplier<UUID> operationIds;
    private final LogoutRecoveryPort logoutRecovery;

    public AuthenticationService(AuthUserRepository users, PasswordVerifier passwords,
            AuthorizationGraphRepository graphs, AuthorizationSnapshotCompiler compiler,
            AuthorizationSnapshotStore snapshots, AccountSessionPort sessions,
            RefreshTokenStore refreshTokens, Clock clock, Supplier<UUID> operationIds,
            LogoutRecoveryPort logoutRecovery) {
        this.users = users; this.passwords = passwords; this.graphs = graphs; this.compiler = compiler;
        this.snapshots = snapshots; this.sessions = sessions; this.refreshTokens = refreshTokens; this.clock = clock;
        this.operationIds = operationIds; this.logoutRecovery = logoutRecovery;
    }

    public LoginResult login(String username, String password) {
        var user = users.findByUsername(username);
        if (user == null || !user.enabled() || user.deleted() || !passwords.matches(password, user.passwordHash())) {
            throw new Unauthorized(INVALID_CREDENTIALS, "Invalid credentials");
        }
        var refresh = refreshTokens.issue(user.id(),user.credentialRevision());
        AccessSession access = null;
        try {
            access = sessions.login(user.id(), user.credentialRevision());
            var snapshot = compiler.compile(graphs.load(user.id()), clock.instant());
            if (!snapshots.initializeReady(snapshot)) throw new AuthorizationUnavailable();
            if(users.credentialRevision(user.id())!=user.credentialRevision())
                throw new Unauthorized(CREDENTIALS_CHANGED,"Credentials changed during sign-in");
            return new LoginResult(access.token(), refresh, access.expiresInSeconds());
        } catch (RuntimeException exception) {
            try { refreshTokens.revoke(refresh); } catch (RuntimeException cleanup) { exception.addSuppressed(cleanup); }
            if (access != null) {
                try { sessions.logoutToken(access.token()); } catch (RuntimeException cleanup) { exception.addSuppressed(cleanup); }
            }
            throw exception;
        }
    }

    public void logoutAll(java.util.UUID userId) {
        var state = snapshots.load(userId);
        if (!(state instanceof AuthorizationSnapshot ready)) throw new AuthorizationUnavailable();
        var fence = new AuthorizationFence(userId, ready.revision(), operationIds.get(), clock.instant());
        if (!snapshots.fence(fence)) throw new AuthorizationUnavailable();
        try {
            refreshTokens.revokeAll(userId);
            sessions.kickoutAll(userId);
            if (!snapshots.deleteIfFence(fence)) throw new AuthorizationUnavailable();
        } catch (RuntimeException failure) {
            try { logoutRecovery.record(fence, failure); } catch (RuntimeException recoveryFailure) {
                failure.addSuppressed(recoveryFailure);
            }
            throw new AuthorizationUnavailable();
        }
    }
}
